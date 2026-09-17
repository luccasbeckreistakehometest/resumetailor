/**
 * Cross-site request check for state-changing API calls. SameSite=Lax cookies still travel on a
 * POST from a sibling subdomain (marqa.online and betmatic.marqa.online are the same "site" as
 * resumetailor.marqa.online), and request.json() ignores Content-Type, so a page on a sibling app
 * could otherwise act with a signed-in visitor's cookies. Pure, so it is unit-tested.
 */
export interface OriginHeaders {
  origin: string | null;
  secFetchSite: string | null;
  host: string | null;
  forwardedHost: string | null;
}

const hostOf = (value: string | null) => value?.split(",")[0]?.trim().toLowerCase() || null;

export function isSameOriginRequest(h: OriginHeaders, baseUrl: string): boolean {
  if (h.origin !== null) {
    if (h.origin === "null") return false;          // sandboxed frames and other opaque origins
    let origin: URL;
    try { origin = new URL(h.origin); } catch { return false; }
    try { if (origin.origin === new URL(baseUrl).origin) return true; } catch { /* no usable base URL */ }
    // The browser sets Host to the server it is talking to; a page elsewhere cannot change it.
    const target = hostOf(h.forwardedHost) ?? hostOf(h.host);
    return !!target && origin.host.toLowerCase() === target;
  }
  // No Origin header: browsers send one on every cross-origin POST, so this is a same-origin
  // navigation or a non-browser client (no ambient cookies). Fetch Metadata still gets a say.
  const site = h.secFetchSite?.toLowerCase();
  return !site || site === "same-origin" || site === "none";
}

/** Paths a third party legitimately POSTs to (payment providers, from their servers). */
export const ORIGIN_EXEMPT = ["/api/webhooks/"];

export const isSafeMethod = (method: string) => method === "GET" || method === "HEAD" || method === "OPTIONS";
