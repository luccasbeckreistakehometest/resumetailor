import { getDb, newId, nowIso } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";

/**
 * Recorded AI spend. Every model call and every TTS synthesis lands in ai_usage with its cost;
 * the global daily ceiling (AI_DAILY_BUDGET_USD, per UTC day) is checked against that sum.
 */
export interface UsageInput { feature: string; ownerKey?: string | null; ip?: string | null; model?: string; costUsd?: number; ok?: boolean; error?: string | null }

export function recordUsage(u: UsageInput): void {
  try {
    getDb().prepare("INSERT INTO ai_usage (id,feature,ownerKey,ip,model,costUsd,ok,error,createdAt) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(newId("ai"), u.feature, u.ownerKey ?? null, u.ip ?? null, u.model ?? "", u.costUsd ?? 0, u.ok === false ? 0 : 1, u.error ? u.error.slice(0, 500) : null, nowIso());
  } catch (error) {
    console.error("recordUsage", error);
  }
}

const dayStart = (now: number) => { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

export function spentToday(now = Date.now()): number {
  const row = getDb().prepare("SELECT COALESCE(SUM(costUsd), 0) c FROM ai_usage WHERE createdAt >= ?").get(dayStart(now)) as { c: number };
  return row.c;
}

export const dailyBudget = () => envNumber("AI_DAILY_BUDGET_USD", 25);

/** True once today's recorded spend reached the ceiling: the kill switch for every AI and TTS call. */
export function overBudget(now = Date.now()): boolean {
  const budget = dailyBudget();
  return budget >= 0 && spentToday(now) >= budget;
}

/** Estimated TTS cost (providers bill per character). */
export const ttsCost = (chars: number) => (chars / 1000) * envNumber("TTS_COST_PER_1K_CHARS_USD", 0.3);

export function recentAiErrors(limit = 30) {
  return getDb().prepare("SELECT feature, error, ip, createdAt FROM ai_usage WHERE ok = 0 ORDER BY createdAt DESC LIMIT ?").all(limit) as { feature: string; error: string | null; ip: string | null; createdAt: string }[];
}

export function spendByFeatureToday(now = Date.now()) {
  return getDb().prepare("SELECT feature, COUNT(*) calls, COALESCE(SUM(costUsd),0) costUsd FROM ai_usage WHERE createdAt >= ? GROUP BY feature ORDER BY costUsd DESC").all(dayStart(now)) as { feature: string; calls: number; costUsd: number }[];
}
