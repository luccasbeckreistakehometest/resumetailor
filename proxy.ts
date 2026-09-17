import { NextResponse, type NextRequest } from "next/server";
import { ORIGIN_EXEMPT, isSafeMethod, isSameOriginRequest } from "@/lib/server/origin";
import { baseUrl } from "@/lib/server/env";

/**
 * Every state-changing API call must come from this app's own pages (see lib/server/origin.ts).
 * Payment webhooks are exempt: they are server-to-server and verified on their own.
 */
export function proxy(request: NextRequest) {
  if (isSafeMethod(request.method)) return NextResponse.next();
  const path = request.nextUrl.pathname;
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

export const config = { matcher: "/api/:path*" };
