import { getDb } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";

/**
 * The caller's IP. Caddy (the only way in, in production) replaces X-Forwarded-For with the real
 * client address, so the first entry is trustworthy there. Locally it falls back to "local".
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  return headers.get("x-real-ip")?.trim().slice(0, 64) || "local";
}

export interface LimitResult { ok: boolean; count: number; limit: number; retryAfter: number; bucket: string; key: string; windowStart: number }

/**
 * Fixed-window counter. `hit` counts this attempt and says whether it is within `max` for the
 * window; `peek` only reads (for lockouts that count failures, not attempts).
 */
export function hit(bucket: string, key: string, max: number, windowSec: number, now = Date.now()): LimitResult {
  const windowMs = windowSec * 1000;
  const start = Math.floor(now / windowMs) * windowMs;
  const db = getDb();
  const row = db.prepare(`INSERT INTO rate_limits (bucket, key, windowStart, count, expiresAt) VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(bucket, key, windowStart) DO UPDATE SET count = count + 1 RETURNING count`).get(bucket, key, start, start + windowMs) as { count: number };
  if (Math.random() < 0.02) sweep(now);
  return { ok: row.count <= max, count: row.count, limit: max, retryAfter: Math.ceil((start + windowMs - now) / 1000), bucket, key, windowStart: start };
}

export function peek(bucket: string, key: string, max: number, windowSec: number, now = Date.now()): LimitResult {
  const windowMs = windowSec * 1000;
  const start = Math.floor(now / windowMs) * windowMs;
  const row = getDb().prepare("SELECT count FROM rate_limits WHERE bucket = ? AND key = ? AND windowStart = ?").get(bucket, key, start) as { count: number } | undefined;
  const count = row?.count ?? 0;
  return { ok: count < max, count, limit: max, retryAfter: Math.ceil((start + windowMs - now) / 1000), bucket, key, windowStart: start };
}

/** Gives back one counted attempt in the window it was counted in. Never goes below zero. */
export function refund(res: Pick<LimitResult, "bucket" | "key" | "windowStart">): void {
  getDb().prepare("UPDATE rate_limits SET count = count - 1 WHERE bucket = ? AND key = ? AND windowStart = ? AND count > 0").run(res.bucket, res.key, res.windowStart);
}

export interface LimitSpec { bucket: string; key: string; max: number; windowSec: number }
export type Reservation = { ok: true; release: () => void } | { ok: false; failed: LimitResult };

/**
 * Counts one attempt against every limit BEFORE the slow step it guards (scrypt, an AI call).
 * better-sqlite3 is synchronous, so the whole loop runs without yielding: of a burst of parallel
 * requests, at most `max` get through, where a read-then-count-later check let them all pass.
 * Past any limit nothing stays counted and the failing result comes back. `release()` gives the
 * slots back when the attempt should not count after all (a right PIN or password, an AI call
 * that failed); it only acts once.
 */
export function reserveSpecs(specs: LimitSpec[], now = Date.now()): Reservation {
  const taken: LimitResult[] = [];
  let released = false;
  const release = () => { if (released) return; released = true; for (const r of taken) refund(r); };
  for (const s of specs) {
    const res = hit(s.bucket, s.key, s.max, s.windowSec, now);
    taken.push(res);
    if (!res.ok) { release(); return { ok: false, failed: res }; }
  }
  return { ok: true, release };
}

export function clearLimit(bucket: string, key: string): void {
  getDb().prepare("DELETE FROM rate_limits WHERE bucket = ? AND key = ?").run(bucket, key);
}

function sweep(now: number): void {
  getDb().prepare("DELETE FROM rate_limits WHERE expiresAt < ?").run(now);
}

/**
 * Every limit in one place, each adjustable by env (RL_<NAME>) so an operator can loosen or
 * tighten one without a deploy. Values are [max, windowSeconds].
 */
const DEFAULTS = {
  GENERATE_IP_HOUR: [20, 3600],
  GENERATE_OWNER_HOUR: [12, 3600],
  GENERATE_USER_DAY: [40, 86_400],
  FIT_IP_HOUR: [30, 3600],
  FIT_IP_DAY: [30, 86_400],
  VOICE_IP_HOUR: [80, 3600],
  VOICE_IP_DAY: [200, 86_400],
  VOICE_OWNER_HOUR: [50, 3600],
  VOICE_BRIEFINGS_OWNER_DAY: [6, 86_400],
  VOICE_BRIEFINGS_IP_DAY: [20, 86_400],
  SPEAK_IP_DAY: [300, 86_400],
  SPEAK_OWNER_DAY: [80, 86_400],
  INTERVIEW_IP_HOUR: [80, 3600],
  INTERVIEW_OWNER_HOUR: [60, 3600],
  INSIGHTS_IP_HOUR: [15, 3600],
  INSIGHTS_OWNER_DAY: [15, 86_400],
  KIT_EXTRAS_OWNER_HOUR: [30, 3600],
  KIT_EXTRAS_IP_HOUR: [40, 3600],
  REGISTER_IP_HOUR: [5, 3600],
  REGISTER_IP_DAY: [15, 86_400],
  LOGIN_FAIL_IP_15M: [20, 900],
  LOGIN_FAIL_ACCOUNT_15M: [5, 900],
  PIN_FAIL_SLUG_IP_15M: [5, 900],
  PIN_FAIL_SLUG_HOUR: [40, 3600],
  PIN_FAIL_IP_HOUR: [30, 3600],
  CONTACT_IP_HOUR: [5, 3600],
  PASSWORD_USER_15M: [6, 900],
  EXPORT_USER_HOUR: [6, 3600],
  KIT_EDIT_OWNER_HOUR: [600, 3600],
  JOB_IMPORT_OWNER_DAY: [30, 86_400],
  VOUCHER_USER_HOUR: [10, 3600],
  VOUCHER_IP_HOUR: [20, 3600],
  JOB_IMPORT_IP_HOUR: [40, 3600],
  KIT_EXPORT_KIT_DAY: [30, 86_400],
  ANALYTICS_IP_HOUR: [600, 3600],
  ANALYTICS_NEW_VISITOR_IP_DAY: [60, 86_400],
  PROFILE_WRITE_IP_HOUR: [30, 3600],
  KIT_REFRESH_KIT_DAY: [3, 86_400],
} as const satisfies Record<string, readonly [number, number]>;
export type LimitName = keyof typeof DEFAULTS;

export function rule(name: LimitName): { max: number; windowSec: number } {
  const [max, windowSec] = DEFAULTS[name];
  return { max: envNumber(`RL_${name}`, max), windowSec };
}

/** Counts one attempt against a named rule. */
export function take(name: LimitName, key: string): LimitResult {
  const r = rule(name);
  return hit(name, key, r.max, r.windowSec);
}

/**
 * A short lease: at most one slow step at a time for `key` (e.g. one AI call per kit variant).
 * Stored in SQLite so every route bundle of the process sees it; it lapses with its window if the
 * process dies mid-call. Release it in a `finally`.
 */
export function lease(bucket: string, key: string, seconds = 300): Reservation {
  return reserveSpecs([{ bucket, key, max: 1, windowSec: seconds }]);
}

/** Reserves one attempt against named rules (see reserveSpecs). */
export function reserve(pairs: [LimitName, string][]): Reservation {
  return reserveSpecs(pairs.map(([name, key]) => ({ bucket: name, key, ...rule(name) })));
}

/** First failing result among several attempts, all of which are counted. */
export function takeAll(pairs: [LimitName, string][]): LimitResult | null {
  let failed: LimitResult | null = null;
  for (const [name, key] of pairs) {
    const res = take(name, key);
    if (!res.ok && !failed) failed = res;
  }
  return failed;
}
