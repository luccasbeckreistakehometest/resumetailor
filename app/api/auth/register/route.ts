import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, anonId, sessionTokenFor } from "@/lib/server/session";
import { claimAnonymous, createUser, findByEmail, toPublic } from "@/lib/server/users";
import { recordEvent } from "@/lib/server/onboarding";
import { isDisposableEmail } from "@/lib/server/disposable";
import { jsonError, requestIp } from "@/lib/server/http";
import { takeAll } from "@/lib/server/ratelimit";

const schema = z.object({
  email: z.string().trim().max(200).email(), password: z.string().min(8).max(200), name: z.string().trim().max(80).optional(),
  lang: z.enum(["en", "pt", "es"]).optional(), acceptTerms: z.boolean().optional(),
});

/**
 * Creates an account with the free first credit. Consent to the terms and the privacy policy is
 * required and stored with its time; throwaway domains are refused; signups and signup bonuses
 * are capped per IP.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("invalid_signup", 400);
  if (parsed.data.acceptTerms !== true) return jsonError("terms_required", 400);
  const ip = await requestIp();
  const over = takeAll([["REGISTER_IP_HOUR", ip], ["REGISTER_IP_DAY", ip]]);
  if (over) return jsonError("rate_limited", 429, { retryAfter: over.retryAfter });
  if (isDisposableEmail(parsed.data.email)) return jsonError("email_disposable", 400);
  if (findByEmail(parsed.data.email)) return jsonError("email_taken", 409);
  let user;
  try {
    user = await createUser({ ...parsed.data, ip, termsAccepted: true });
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) return jsonError("email_taken", 409);
    throw error;
  }
  // Whatever they made before signing up comes with them.
  const anon = await anonId();
  claimAnonymous(user.id, anon);
  recordEvent(user.id, "signup", { lang: user.lang, claimedAnon: !!anon, bonus: user.credits > 0 });
  const res = NextResponse.json({ ok: true, user: toPublic(user), bonus: user.credits > 0 });
  res.cookies.set(SESSION_COOKIE, sessionTokenFor(user), SESSION_COOKIE_OPTIONS);
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
