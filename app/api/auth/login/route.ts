import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, anonId, sessionTokenFor } from "@/lib/server/session";
import { authenticate, claimAnonymous, ensureAdmin, toPublic } from "@/lib/server/users";
import { jsonError, requestIp } from "@/lib/server/http";
import { clearLimit, reserve } from "@/lib/server/ratelimit";
import { linkVisitor } from "@/lib/server/analytics";

const schema = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

/**
 * Attempts are counted per IP and per account before the password is checked, and given back when
 * it was right, so a parallel burst cannot get more than the limit checked. Past either limit the
 * endpoint refuses without checking the password until the window passes (credential stuffing).
 */
export async function POST(request: Request) {
  await ensureAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !parsed.data.email || !parsed.data.password) return jsonError("email_password_required", 400);
  const ip = await requestIp();
  const account = parsed.data.email.toLowerCase();
  const slot = reserve([["LOGIN_FAIL_ACCOUNT_15M", account], ["LOGIN_FAIL_IP_15M", ip]]);
  if (!slot.ok) return jsonError("account_locked", 429, { retryAfter: slot.failed.retryAfter });
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return jsonError("wrong_credentials", 401);   // the reserved slots stay counted
  slot.release();
  clearLimit("LOGIN_FAIL_ACCOUNT_15M", account);
  const anon = await anonId();
  claimAnonymous(user.id, anon);
  linkVisitor(user.id, anon);
  const res = NextResponse.json({ ok: true, user: toPublic(user) });
  res.cookies.set(SESSION_COOKIE, sessionTokenFor(user), SESSION_COOKIE_OPTIONS);
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
