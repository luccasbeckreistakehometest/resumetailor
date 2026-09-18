import { aiConfigured, classifyAiError } from "@/lib/ai/client";
import { aiReady, noteAiFailure, noteAiSuccess } from "@/lib/ai/health";
import { budgetBlock, callEstimateUsd, failedCallFloorUsd, reserveSpend, settleSpend } from "@/lib/server/spend";
import { bad, type Reply } from "@/lib/server/http";

const warnedDay: Record<"all" | "anon", string> = { all: "", anon: "" };
const MESSAGE: Record<"all" | "anon", string> = {
  all: "[ai-budget] daily AI spend ceiling reached — AI features paused until 00:00 UTC (AI_DAILY_BUDGET_USD)",
  anon: "[ai-budget] anonymous slice of the daily AI budget used up — visitors without an account paused until 00:00 UTC (AI_ANON_DAILY_BUDGET_USD)",
};
const warnOnce = (which: "all" | "anon") => {
  const day = new Date().toISOString().slice(0, 10);
  if (warnedDay[which] !== day) { warnedDay[which] = day; console.error(MESSAGE[which]); }
};

/**
 * Who is calling, as `withOwner` resolved them. Anonymity is `userId === null` — a fact about the
 * session, not a guess from the shape of `key`, which for a visitor is a cookie value.
 */
export interface AiCaller { userId: string | null; key: string; ip: string }

const usageOf = (feature: string, ctx: AiCaller) => ({ feature, ownerKey: ctx.key, ip: ctx.ip, anonymous: ctx.userId === null });

/**
 * Can an AI call be attempted right now, for this caller? A reply to send back when not. This is
 * a read-only look ahead, for routes that would otherwise do expensive work (or spend a credit)
 * before finding out; `runAi` re-checks and reserves atomically.
 */
export function aiGate(caller: AiCaller): Reply | null {
  if (!aiConfigured() || !aiReady()) return bad("ai_unavailable", 503);
  const blocked = budgetBlock({ anonymous: caller.userId === null });
  if (blocked) { warnOnce(blocked); return bad("ai_busy", 503); }
  return null;
}

/**
 * Runs one AI step with the gate, cost recording and health bookkeeping. On failure the caller
 * gets a neutral error code to send; the operator detail goes to the log and to ai_usage.
 *
 * The estimated cost is taken out of the day's budget before the call and settled with the real
 * one after, so a burst of parallel calls cannot sail past the ceiling together.
 */
export async function runAi<T extends { costUsd: number; model?: string }>(
  feature: string, ctx: AiCaller, fn: () => Promise<T>, opts: { estimateUsd?: number } = {},
): Promise<{ ok: true; value: T } | { ok: false; reply: Reply }> {
  if (!aiConfigured() || !aiReady()) return { ok: false, reply: bad("ai_unavailable", 503) };
  const held = reserveSpend({ ...usageOf(feature, ctx), estimateUsd: opts.estimateUsd ?? callEstimateUsd(feature) });
  if (!held.ok) { warnOnce(held.blocked); return { ok: false, reply: bad("ai_busy", 503) }; }
  try {
    const value = await fn();
    settleSpend(held.id, { model: value.model, costUsd: value.costUsd, ok: true });
    noteAiSuccess();
    return { ok: true, value };
  } catch (error) {
    const { kind, detail } = classifyAiError(error);
    console.error(`[ai:${feature}] ${kind}: ${detail}`);
    // A call that errored was still billed for its input tokens by most providers.
    settleSpend(held.id, { costUsd: failedCallFloorUsd(), ok: false, error: `${kind}: ${detail}` });
    noteAiFailure(kind, detail);
    const reply = kind === "rate" ? bad("ai_busy", 503)
      : kind === "auth" || kind === "credit" || kind === "connection" ? bad("ai_unavailable", 503)
      : bad("ai_failed", 502);
    return { ok: false, reply };
  }
}
