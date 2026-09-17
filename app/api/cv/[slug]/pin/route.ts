import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBySlug, pinCookieName, pinToken, verifyPin } from "@/lib/server/publicResumes";

const schema = z.object({ pin: z.string().min(1).max(12) });

/** Checks the PIN and, when right, marks this browser as verified for that page with a signed cookie. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "pin" }, { status: 400 });
  const row = getPublicBySlug(slug);
  // A wrong PIN and a missing page look the same from outside; the response also takes a moment so guessing stays slow.
  await new Promise((r) => setTimeout(r, 350));
  if (!row || row.enabled !== 1 || !verifyPin(row, parsed.data.pin)) return NextResponse.json({ error: "wrong" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(pinCookieName(slug), pinToken(row), { httpOnly: true, sameSite: "lax", path: `/cv/${slug}`, maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  return res;
}
