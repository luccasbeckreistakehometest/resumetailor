/**
 * First-party analytics: the only event names the collector accepts, and the pure helpers shared
 * by the browser (what to send) and the server (what to keep). No third-party script, no IP.
 */
export const EVENT_NAMES = [
  "page_view", "cta_click", "lang_switch", "start_choose", "start_mode", "voice_start", "preview_ready", "signup", "unlock",
  "checkout_start", "purchase", "ats_check_run", "fit_run", "compare_run", "interview_start", "pitch_record", "publish_on",
  "application_add", "export_docx", "voucher_redeem", "tour_start", "tour_done", "share_click",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
export const isEventName = (v: unknown): v is EventName => typeof v === "string" && (EVENT_NAMES as readonly string[]).includes(v);

/**
 * What the browser beacon may report. Conversions (preview, signup, unlock, checkout, purchase,
 * codes, exports, tours…) are recorded only by the server, where they actually happen, so nobody
 * can post a fake purchase into the funnel.
 */
export const CLIENT_EVENT_NAMES = [
  "page_view", "cta_click", "lang_switch", "start_choose", "start_mode", "voice_start", "ats_check_run", "compare_run", "share_click",
] as const satisfies readonly EventName[];
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];
export const isClientEventName = (v: unknown): v is ClientEventName => typeof v === "string" && (CLIENT_EVENT_NAMES as readonly string[]).includes(v);

export interface Utm { source: string; medium: string; campaign: string; content: string; term: string }
const MAX = 100;
const clip = (v: string | null | undefined) => (v ?? "").trim().toLowerCase().replace(/\s+/g, "_").slice(0, MAX);

/** UTM tags from a query string, lower-cased and clipped; click ids only hint the source. */
export function parseUtm(search: string): Utm {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  let source = clip(q.get("utm_source"));
  if (!source && q.get("gclid")) source = "google";
  if (!source && q.get("fbclid")) source = "meta";
  if (!source && q.get("ttclid")) source = "tiktok";
  return { source, medium: clip(q.get("utm_medium")), campaign: clip(q.get("utm_campaign")), content: clip(q.get("utm_content")), term: clip(q.get("utm_term")) };
}

export const hasUtm = (u: Utm) => !!(u.source || u.medium || u.campaign);

/** Referrer host only (never the full URL); our own host counts as none. */
export function refHost(referrer: string, ownHost: string): string {
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "").slice(0, MAX);
    return h === ownHost.replace(/^www\./, "") ? "" : h;
  } catch { return ""; }
}

/** props: at most 1 KB of flat strings, numbers and booleans. */
export function cleanProps(p: unknown): Record<string, string | number | boolean> | null {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>).slice(0, 20)) {
    if (typeof v === "string") out[k.slice(0, 40)] = v.slice(0, 120);
    else if (typeof v === "number" && Number.isFinite(v)) out[k.slice(0, 40)] = v;
    else if (typeof v === "boolean") out[k.slice(0, 40)] = v;
  }
  const json = JSON.stringify(out);
  return json.length > 1024 ? null : out;
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http|java\/|headless|lighthouse|pingdom|uptime/i;
/** Crawlers and scripts never count. The e2e suite (a headless browser) opts in with ANALYTICS_ALLOW_HEADLESS. */
export function isBot(ua: string, allowHeadless = false): boolean {
  if (!ua) return true;
  const probe = allowHeadless ? ua.replace(/HeadlessChrome/gi, "Chrome") : ua;
  return BOTS.test(probe);
}

/** Global Privacy Control or Do Not Track on the request: nothing is counted for this visitor. */
export const optedOut = (h: Pick<Headers, "get">) => h.get("sec-gpc") === "1" || h.get("dnt") === "1";

export const deviceOf = (ua: string) => (/mobi|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop");
