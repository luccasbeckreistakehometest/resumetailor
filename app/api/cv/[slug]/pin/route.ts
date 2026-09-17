import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBySlug, pinCookieName, pinToken, verifyPin } from "@/lib/server/publicResumes";
import { requestIp, jsonError } from "@/lib/server/http";
import { reserve } from "@/lib/server/ratelimit";
import { secureCookies } from "@/lib/server/env";

const schema = z.object({ pin: z.string().min(1).max(12) });

/**
 * Checks the PIN and, when right, marks this browser as verified for that page with a signed
 * cookie. Every try is counted per page+IP, per page and per IP BEFORE the PIN is checked, and
 * given back only when it was right: a parallel burst gets at most the limit checked, and past it
 * every try is refused until the window passes (a 4-digit PIN would otherwise fall to brute force).
 */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("pin_invalid", 400);
  const ip = await requestIp();
  const slugKey = slug.slice(0, 80);
  const slot = reserve([["PIN_FAIL_SLUG_IP_15M", `${slugKey}|${ip}`], ["PIN_FAIL_SLUG_HOUR", slugKey], ["PIN_FAIL_IP_HOUR", ip]]);
  if (!slot.ok) return jsonError("rate_limited", 429, { retryAfter: slot.failed.retryAfter });
  const row = getPublicBySlug(slug);
  // A wrong PIN and a missing page look the same from outside.
  const ok = !!row && row.enabled === 1 && (await verifyPin(row, parsed.data.pin));
  if (!ok || !row) {
    // The reserved slots stay counted: this was a failure.
    await new Promise((r) => setTimeout(r, 250));
    return jsonError("pin_wrong", 403);
  }
  slot.release();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(pinCookieName(slug), pinToken(row), { httpOnly: true, sameSite: "lax", path: `/cv/${slug}`, maxAge: 60 * 60 * 24 * 30, secure: secureCookies() });
  return res;
}
