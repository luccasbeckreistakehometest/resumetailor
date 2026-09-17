import { NextResponse } from "next/server";
import { REF_COOKIE, normaliseCode } from "@/lib/server/vouchers";
import { baseUrl, secureCookies } from "@/lib/server/env";

/** A friend's share link: remembered for 30 days, then the home page in the visitor's language. */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
  const home = accept.startsWith("pt") ? "/pt" : accept.startsWith("es") ? "/es" : "/";
  const res = NextResponse.redirect(`${baseUrl()}${home}`, 302);
  const clean = normaliseCode(code);
  if (clean.length >= 4) res.cookies.set(REF_COOKIE, clean, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86_400, secure: secureCookies() });
  return res;
}
