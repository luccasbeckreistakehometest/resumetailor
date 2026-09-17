import { NextResponse, type NextRequest } from "next/server";
import { ORIGIN_EXEMPT, isSafeMethod, isSameOriginRequest } from "@/lib/server/origin";
import { baseUrl, secureCookies } from "@/lib/server/env";
import { ANON_COOKIE, SESSION_COOKIE, newAnonId } from "@/lib/server/auth";

const CRAWLER = /bot|crawl|spider|slurp|facebookexternalhit|preview/i;

/**
 * Pages: a first-time visitor gets the visitor cookie on the page itself, so every call the page
 * makes next (tour, analytics beacon, generation) is attributed to one visitor instead of racing
 * to mint several. APIs: every state-changing call must come from this app's own pages (see
 * lib/server/origin.ts); payment webhooks are exempt (server-to-server, verified on their own).
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    const res = NextResponse.next();
    if (request.method === "GET" && !request.cookies.get(ANON_COOKIE) && !request.cookies.get(SESSION_COOKIE) && !CRAWLER.test(request.headers.get("user-agent") ?? "")) {
      res.cookies.set(ANON_COOKIE, newAnonId(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: secureCookies() });
    }
    return res;
  }
  if (isSafeMethod(request.method)) return NextResponse.next();
  if (ORIGIN_EXEMPT.some((prefix) => path.startsWith(prefix))) return NextResponse.next();
  const ok = isSameOriginRequest({
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
  }, baseUrl());
  if (ok) return NextResponse.next();
  return NextResponse.json({ error: "forbidden", reason: "cross_site" }, { status: 403 });
}

// Everything except build assets and metadata files.
export const config = { matcher: ["/((?!_next/|icon|opengraph-image|robots\\.txt|sitemap\\.xml|favicon).*)"] };
