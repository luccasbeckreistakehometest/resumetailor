import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE, signSession } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, anonId } from "@/lib/server/session";
import { authenticate, claimAnonymous, ensureAdmin, toPublic } from "@/lib/server/users";

const schema = z.object({ email: z.string().trim(), password: z.string() });

export async function POST(request: Request) {
  ensureAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  const user = authenticate(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  claimAnonymous(user.id, await anonId());
  const res = NextResponse.json({ ok: true, user: toPublic(user) });
  res.cookies.set(SESSION_COOKIE, signSession({ userId: user.id, role: user.role }), SESSION_COOKIE_OPTIONS);
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
