import { aiConfigured, classifyAiError } from "@/lib/ai/client";
import { aiReady, noteAiFailure, noteAiSuccess } from "@/lib/ai/health";
import { overBudget, recordUsage } from "@/lib/server/spend";
import { bad, type Reply } from "@/lib/server/http";

let budgetWarnedDay = "";

/** Can an AI call be attempted right now? A reply to send back when not. */
export function aiGate(): Reply | null {
  if (!aiConfigured() || !aiReady()) return bad("ai_unavailable", 503);
  if (overBudget()) {
    const day = new Date().toISOString().slice(0, 10);
    if (budgetWarnedDay !== day) { budgetWarnedDay = day; console.error("[ai-budget] daily AI spend ceiling reached — AI features paused until 00:00 UTC (AI_DAILY_BUDGET_USD)"); }
    return bad("ai_busy", 503);
  }
  return null;
}

/**
 * Runs one AI step with the gate, cost recording and health bookkeeping. On failure the caller
 * gets a neutral error code to send; the operator detail goes to the log and to ai_usage.
 */
export async function runAi<T extends { costUsd: number; model?: string }>(
  feature: string, ctx: { ownerKey?: string | null; ip?: string | null }, fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; reply: Reply }> {
  const gate = aiGate();
  if (gate) return { ok: false, reply: gate };
  try {
    const value = await fn();
    recordUsage({ feature, ownerKey: ctx.ownerKey, ip: ctx.ip, model: value.model, costUsd: value.costUsd, ok: true });
    noteAiSuccess();
    return { ok: true, value };
  } catch (error) {
    const { kind, detail } = classifyAiError(error);
    console.error(`[ai:${feature}] ${kind}: ${detail}`);
    recordUsage({ feature, ownerKey: ctx.ownerKey, ip: ctx.ip, ok: false, error: `${kind}: ${detail}` });
    noteAiFailure(kind, detail);
    const reply = kind === "rate" ? bad("ai_busy", 503)
      : kind === "auth" || kind === "credit" || kind === "connection" ? bad("ai_unavailable", 503)
      : bad("ai_failed", 502);
    return { ok: false, reply };
  }
}
