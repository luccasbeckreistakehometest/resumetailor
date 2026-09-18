import { getDb, newId, nowIso } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";

/**
 * Recorded AI spend. Every model call and every TTS synthesis lands in ai_usage with its cost;
 * the global daily ceiling (AI_DAILY_BUDGET_USD, per UTC day) is checked against that sum.
 */
export interface UsageInput { feature: string; ownerKey?: string | null; ip?: string | null; anonymous: boolean; model?: string; costUsd?: number; ok?: boolean; error?: string | null }

/**
 * Records a call that already happened, without taking part in the budget. Anything that is about
 * to SPEND should use reserveSpend/settleSpend instead, so parallel calls cannot pass the ceiling
 * together.
 *
 * `anonymous` is the caller having no account, decided at the call site from `owner.userId` —
 * never guessed from the shape of `ownerKey`, which for a visitor is a cookie value.
 */
export function recordUsage(u: UsageInput): void {
  try {
    insertUsage(u, u.costUsd ?? 0, 0);
  } catch (error) {
    console.error("recordUsage", error);
  }
}

function insertUsage(u: UsageInput, costUsd: number, pending: 0 | 1): string {
  const id = newId("ai");
  getDb().prepare("INSERT INTO ai_usage (id,feature,ownerKey,ip,isAnon,model,costUsd,ok,error,pending,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, u.feature, u.ownerKey ?? null, u.ip ?? null, u.anonymous ? 1 : 0, u.model ?? "", costUsd, u.ok === false ? 0 : 1, u.error ? u.error.slice(0, 500) : null, pending, nowIso());
  return id;
}

const dayStart = (now: number) => { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

export function spentToday(now = Date.now()): number {
  const row = getDb().prepare("SELECT COALESCE(SUM(costUsd), 0) c FROM ai_usage WHERE createdAt >= ?").get(dayStart(now)) as { c: number };
  return row.c;
}

export const dailyBudget = () => envNumber("AI_DAILY_BUDGET_USD", 25);

/**
 * The share of the daily ceiling anonymous visitors may use (default: a fifth of it). Anonymous
 * endpoints need no account, so without their own slice one address could spend the whole day's
 * budget and switch AI off for paying customers. A negative value removes the slice.
 */
export const anonDailyBudget = () => {
  const total = dailyBudget();
  const slice = envNumber("AI_ANON_DAILY_BUDGET_USD", Math.round(total * 20) / 100);
  return slice < 0 || total < 0 ? slice : Math.min(slice, total);
};

export function spentTodayAnonymous(now = Date.now()): number {
  const row = getDb().prepare("SELECT COALESCE(SUM(costUsd), 0) c FROM ai_usage WHERE createdAt >= ? AND isAnon = 1").get(dayStart(now)) as { c: number };
  return row.c;
}

/**
 * Which ceiling stops this call, if any: the whole day's budget, or the anonymous slice of it.
 * Anonymous calls stop at their slice, which leaves the rest of the budget to signed-in (and
 * paying) people.
 */
export function budgetBlock(opts: { anonymous?: boolean } = {}, now = Date.now()): "all" | "anon" | null {
  const budget = dailyBudget();
  if (budget >= 0 && spentToday(now) >= budget) return "all";
  if (!opts.anonymous) return null;
  const slice = anonDailyBudget();
  return slice >= 0 && spentTodayAnonymous(now) >= slice ? "anon" : null;
}

/** True once today's recorded spend reached a ceiling: the kill switch for every AI and TTS call. */
export const overBudget = (opts: { anonymous?: boolean } = {}, now = Date.now()): boolean => budgetBlock(opts, now) !== null;

/** What one call is assumed to cost while it is in flight, before the real cost is known. */
export const callEstimateUsd = (feature: string) =>
  envNumber(`AI_ESTIMATE_${feature.toUpperCase()}_USD`, envNumber("AI_CALL_ESTIMATE_USD", 0.05));

/** What a failed call still costs us: providers bill the input tokens of a call that then errors. */
export const failedCallFloorUsd = () => envNumber("AI_FAILED_CALL_FLOOR_USD", 0.002);

/** A hold on the budget, to be settled with the real cost once the call returns. */
export type SpendHold = { ok: true; id: string } | { ok: false; blocked: "all" | "anon" };

/**
 * Takes the estimated cost out of today's budget BEFORE the call runs, by writing the ai_usage row
 * up front. better-sqlite3 is synchronous, so the check and the insert happen without yielding:
 * of a burst of parallel requests only as many as the budget allows get through, where a
 * read-now-record-later check let them all pass (every one of them read the same pre-burst total).
 */
export function reserveSpend(u: UsageInput & { estimateUsd?: number }, now = Date.now()): SpendHold {
  const estimate = Math.max(0, u.estimateUsd ?? callEstimateUsd(u.feature));
  try {
    sweepStaleHolds(now);
    return getDb().transaction((): SpendHold => {
      const blocked = budgetBlock({ anonymous: u.anonymous }, now);
      if (blocked) return { ok: false, blocked };
      return { ok: true, id: insertUsage(u, estimate, 1) };
    })();
  } catch (error) {
    // A budget we cannot read is not a reason to spend: refuse, loudly.
    console.error("reserveSpend", error);
    return { ok: false, blocked: "all" };
  }
}

/** Replaces a hold with what the call really cost (or the floor, when it failed). */
export function settleSpend(id: string, u: { model?: string; costUsd?: number; ok?: boolean; error?: string | null }): void {
  try {
    getDb().prepare("UPDATE ai_usage SET model = ?, costUsd = ?, ok = ?, error = ?, pending = 0 WHERE id = ?")
      .run(u.model ?? "", Math.max(0, u.costUsd ?? 0), u.ok === false ? 0 : 1, u.error ? u.error.slice(0, 500) : null, id);
  } catch (error) {
    console.error("settleSpend", error);
  }
}

const HOLD_TTL_MS = 10 * 60 * 1000;

/**
 * A hold whose request died (a killed process, a hung provider connection) would otherwise sit in
 * the day's total forever. After ten minutes it settles at the floor cost instead.
 */
export function sweepStaleHolds(now = Date.now()): void {
  getDb().prepare("UPDATE ai_usage SET pending = 0, ok = 0, costUsd = ?, error = COALESCE(error, 'hold_abandoned') WHERE pending = 1 AND createdAt < ?")
    .run(failedCallFloorUsd(), new Date(now - HOLD_TTL_MS).toISOString());
}

/** Estimated TTS cost (providers bill per character). */
export const ttsCost = (chars: number) => (chars / 1000) * envNumber("TTS_COST_PER_1K_CHARS_USD", 0.3);

export function recentAiErrors(limit = 30) {
  return getDb().prepare("SELECT feature, error, ip, createdAt FROM ai_usage WHERE ok = 0 ORDER BY createdAt DESC LIMIT ?").all(limit) as { feature: string; error: string | null; ip: string | null; createdAt: string }[];
}

export function spendByFeatureToday(now = Date.now()) {
  return getDb().prepare("SELECT feature, COUNT(*) calls, COALESCE(SUM(costUsd),0) costUsd FROM ai_usage WHERE createdAt >= ? GROUP BY feature ORDER BY costUsd DESC").all(dayStart(now)) as { feature: string; calls: number; costUsd: number }[];
}
