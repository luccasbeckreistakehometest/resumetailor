import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBySlug, pinCookieName, pinToken, verifyPin } from "@/lib/server/publicResumes";
import { requestIp, jsonError } from "@/lib/server/http";
import { allowed, take } from "@/lib/server/ratelimit";
import { secureCookies } from "@/lib/server/env";

const schema = z.object({ pin: z.string().min(1).max(12) });

/**
 * Checks the PIN and, when right, marks this browser as verified for that page with a signed
 * cookie. Wrong guesses are counted per page+IP, per page and per IP; past the limit every try is
 * refused until the window passes (a 4-digit PIN would otherwise fall to a parallel brute force).
 */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("pin_invalid", 400);
  const ip = await requestIp();
  const slugKey = slug.slice(0, 80);
  for (const check of [allowed("PIN_FAIL_SLUG_IP_15M", `${slugKey}|${ip}`), allowed("PIN_FAIL_SLUG_HOUR", slugKey), allowed("PIN_FAIL_IP_HOUR", ip)]) {
    if (!check.ok) return jsonError("rate_limited", 429, { retryAfter: check.retryAfter });
  }
  const row = getPublicBySlug(slug);
  // A wrong PIN and a missing page look the same from outside.
  const ok = !!row && row.enabled === 1 && (await verifyPin(row, parsed.data.pin));
  if (!ok || !row) {
    take("PIN_FAIL_SLUG_IP_15M", `${slugKey}|${ip}`); take("PIN_FAIL_SLUG_HOUR", slugKey); take("PIN_FAIL_IP_HOUR", ip);
    await new Promise((r) => setTimeout(r, 250));
    return jsonError("pin_wrong", 403);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(pinCookieName(slug), pinToken(row), { httpOnly: true, sameSite: "lax", path: `/cv/${slug}`, maxAge: 60 * 60 * 24 * 30, secure: secureCookies() });
  return res;
}
