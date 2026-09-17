"use client";

import type { ClientEventName } from "@/lib/analytics/events";

/** Visitors who asked not to be tracked (Global Privacy Control / Do Not Track) send nothing. */
export function trackingAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return !(n.globalPrivacyControl === true || n.doNotTrack === "1" || n.msDoNotTrack === "1");
}

const SESSION_KEY = "rt_sid";
const IDLE_MS = 30 * 60_000;

/** A session id that lives in this tab's storage and expires after 30 idle minutes. `fresh` says it just started. */
export function sessionId(now = Date.now()): { id: string; fresh: boolean } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const cur = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    const fresh = !cur || now - cur.at > IDLE_MS;
    const id = fresh ? Math.random().toString(36).slice(2, 12) : cur!.id;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return { id, fresh };
  } catch { return { id: "nostore", fresh: false }; }
}

/** Fire-and-forget, survives navigation (sendBeacon), same-origin only. */
export function track(name: ClientEventName, props?: Record<string, string | number | boolean>, extra: Record<string, unknown> = {}): void {
  if (!trackingAllowed()) return;
  const lang = document.documentElement.lang || "en";
  const body = JSON.stringify({ name, props, path: location.pathname, lang, sessionId: sessionId().id, ...extra });
  try {
    const ok = navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }));
    if (!ok) void fetch("/api/e", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* analytics never breaks the page */ }
}
