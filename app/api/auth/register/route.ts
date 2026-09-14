import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE, signSession } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, anonId } from "@/lib/server/session";
import { claimAnonymous, createUser, findByEmail, toPublic } from "@/lib/server/users";
import { recordEvent } from "@/lib/server/onboarding";

const schema = z.object({
  email: z.string().trim().email(), password: z.string().min(8), name: z.string().trim().max(80).optional(),
  lang: z.enum(["en", "pt", "es"]).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  if (findByEmail(parsed.data.email)) return NextResponse.json({ error: "There is already an account with this email. Sign in instead." }, { status: 409 });
  const user = createUser(parsed.data);
  // Whatever they made before signing up comes with them.
  const anon = await anonId();
  claimAnonymous(user.id, anon);
  recordEvent(user.id, "signup", { lang: user.lang, claimedAnon: !!anon });
  const res = NextResponse.json({ ok: true, user: toPublic(user) });
  res.cookies.set(SESSION_COOKIE, signSession({ userId: user.id, role: user.role }), SESSION_COOKIE_OPTIONS);
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
