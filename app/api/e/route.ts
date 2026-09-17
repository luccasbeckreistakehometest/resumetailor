import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { ANON_COOKIE } from "@/lib/server/auth";
import { ANON_COOKIE_OPTIONS, ownerKey } from "@/lib/server/session";
import { deviceOf, isBot, isClientEventName } from "@/lib/analytics/events";
import { admitBeacon, recordAnalytics, visitorFor } from "@/lib/server/analytics";
import { clientIp } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const utmField = z.string().max(300).optional();
const schema = z.object({
  name: z.string().max(40),
  path: z.string().max(300).default(""),
  lang: z.string().max(10).default(""),
  sessionId: z.string().max(40).optional(),
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField, content: utmField, term: utmField }).partial().optional(),
  refHost: z.string().max(200).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

/**
 * The beacon collector. Unknown names, and conversion names only the server may record, are a
 * 400. Crawlers, cross-site calls, calls without a visitor cookie and anything over the per-IP or
 * per-visitor caps are accepted silently (204) and stored nowhere. No IP is kept (it only keys
 * the rate limits, which expire with their window).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isClientEventName(parsed.data.name)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const site = h.get("sec-fetch-site");
  const ignored = isBot(ua, process.env.ANALYTICS_ALLOW_HEADLESS === "1") || (site !== null && site !== "same-origin");
  const owner = await ownerKey();
  const res = new NextResponse(null, { status: 204 });
  if (owner.isNewAnon) res.cookies.set(ANON_COOKIE, owner.anonId, ANON_COOKIE_OPTIONS);
  if (ignored) return res;
  const visitorId = visitorFor({ anonId: owner.anonId, userId: owner.userId }) ?? (owner.anonId || null);
  if (!admitBeacon({ hasCookie: !owner.isNewAnon, visitorId, ip: clientIp(h) })) return res;
  const b = parsed.data;
  recordAnalytics({
    name: b.name as never, visitorId, userId: owner.userId,
    sessionId: b.sessionId, path: b.path, lang: b.lang, utm: b.utm, refHost: b.refHost, device: deviceOf(ua), props: b.props,
  });
  return res;
}
