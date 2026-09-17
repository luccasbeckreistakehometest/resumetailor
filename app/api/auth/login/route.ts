import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, anonId, sessionTokenFor } from "@/lib/server/session";
import { authenticate, claimAnonymous, ensureAdmin, toPublic } from "@/lib/server/users";
import { jsonError, requestIp } from "@/lib/server/http";
import { allowed, clearLimit, take } from "@/lib/server/ratelimit";

const schema = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

/**
 * Failed attempts are counted per IP and per account; past either limit the endpoint refuses
 * without checking the password until the window passes (backoff against credential stuffing).
 */
export async function POST(request: Request) {
  await ensureAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !parsed.data.email || !parsed.data.password) return jsonError("email_password_required", 400);
  const ip = await requestIp();
  const account = parsed.data.email.toLowerCase();
  const byIp = allowed("LOGIN_FAIL_IP_15M", ip);
  const byAccount = allowed("LOGIN_FAIL_ACCOUNT_15M", account);
  if (!byIp.ok || !byAccount.ok) return jsonError("account_locked", 429, { retryAfter: Math.max(byIp.ok ? 0 : byIp.retryAfter, byAccount.ok ? 0 : byAccount.retryAfter) });
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    take("LOGIN_FAIL_IP_15M", ip);
    take("LOGIN_FAIL_ACCOUNT_15M", account);
    return jsonError("wrong_credentials", 401);
  }
  clearLimit("LOGIN_FAIL_ACCOUNT_15M", account);
  claimAnonymous(user.id, await anonId());
  const res = NextResponse.json({ ok: true, user: toPublic(user) });
  res.cookies.set(SESSION_COOKIE, sessionTokenFor(user), SESSION_COOKIE_OPTIONS);
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
