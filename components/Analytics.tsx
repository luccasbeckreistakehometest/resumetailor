"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasUtm, parseUtm, refHost } from "@/lib/analytics/events";
import { sessionId, track, trackingAllowed } from "@/lib/client/track";

/**
 * One page_view per route change. The first page of a session also carries where the visit came
 * from (UTM tags, ad click ids, the referrer's host). First-party only: the beacon goes to /api/e.
 */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!trackingAllowed() || pathname.startsWith("/admin")) return;
    const { fresh } = sessionId();
    const utm = parseUtm(window.location.search);
    const ref = refHost(document.referrer, window.location.hostname);
    const extra = fresh || hasUtm(utm) ? { utm, refHost: ref } : {};
    track("page_view", undefined, extra);
  }, [pathname]);
  return null;
}
