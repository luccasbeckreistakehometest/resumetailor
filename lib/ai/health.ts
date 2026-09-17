import { aiConfigured, aiMock, type AiErrorKind } from "@/lib/ai/client";
import { env, envNumber, secretEnv } from "@/lib/server/env";
import { getSetting, setSetting } from "@/lib/server/db";

/**
 * Whether the AI actually works, not just whether a key is set. Two signals:
 *  1. a cached key probe (GET /v1/models — free) run at boot and again after a failure;
 *  2. the last real generation: a rejected key or an empty credit balance marks the AI down
 *     right away (the models endpoint answers 200 even with no credit, so the probe alone
 *     would miss that).
 * The /start banner and every AI route read `aiReady()`.
 */
export interface AiHealth { ok: boolean; reason: string | null; checkedAt: number }
interface LastFailure { at: number; kind: AiErrorKind; detail: string }

const OK_TTL_MS = 30 * 60_000;
const retryMs = () => envNumber("AI_PROBE_RETRY_SECONDS", 120) * 1000;
const DOWN_KINDS: AiErrorKind[] = ["auth", "credit"];

const g = globalThis as unknown as { __rtAiHealth?: { probe: AiHealth | null; inflight: Promise<AiHealth> | null; failure: LastFailure | null; lastOkAt: number } };
const state = (g.__rtAiHealth ??= { probe: null, inflight: null, failure: null, lastOkAt: 0 });

type FetchLike = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{ status: number; ok: boolean }>;

let defaultFetch: FetchLike = (url, init) => fetch(url, init);

export async function probeAi(fetchImpl: FetchLike = defaultFetch, now = Date.now()): Promise<AiHealth> {
  if (aiMock()) return (state.probe = { ok: true, reason: null, checkedAt: now });
  const key = secretEnv("ANTHROPIC_API_KEY");
  if (!key || !aiConfigured()) return (state.probe = { ok: false, reason: "no_key", checkedAt: now });
  const base = (env("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com").replace(/\/+$/, "");
  let result: AiHealth;
  try {
    const res = await fetchImpl(`${base}/v1/models?limit=1`, {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(8000),
    });
    if (res.ok) result = { ok: true, reason: null, checkedAt: now };
    else if (res.status === 401 || res.status === 403) result = { ok: false, reason: `key rejected (${res.status})`, checkedAt: now };
    else result = { ok: false, reason: `probe answered ${res.status}`, checkedAt: now };
  } catch (error) {
    result = { ok: false, reason: `probe failed: ${error instanceof Error ? error.message : String(error)}`, checkedAt: now };
  }
  state.probe = result;
  if (result.ok) state.lastOkAt = now;
  else console.error(`[ai-health] ${result.reason}`);
  persist();
  return result;
}

/** Starts a probe unless one is running; never throws. */
export function refreshAiHealth(): Promise<AiHealth> {
  if (!state.inflight) {
    state.inflight = probeAi().finally(() => { state.inflight = null; });
  }
  return state.inflight;
}

function stale(now: number): boolean {
  if (!state.probe) return true;
  return now - state.probe.checkedAt > (state.probe.ok ? OK_TTL_MS : retryMs());
}

/**
 * Synchronous verdict for pages and routes. Optimistic before the first probe answers (the boot
 * probe runs within seconds). A generation that failed on the key or on credit keeps the AI down
 * until a later probe (for a key) or a later successful call (for credit) clears it.
 */
export function aiReady(now = Date.now()): boolean {
  if (aiMock()) {
    // Tests can simulate a dead AI; it heals after the retry window, like a re-probe would.
    return !(state.failure && now - state.failure.at < retryMs());
  }
  if (!aiConfigured()) return false;
  if (stale(now)) void refreshAiHealth();
  if (state.failure && DOWN_KINDS.includes(state.failure.kind)) {
    const healedByProbe = state.failure.kind === "auth" && state.probe?.ok && state.probe.checkedAt > state.failure.at;
    const healedByCall = state.lastOkAt > state.failure.at;
    if (!healedByProbe && !healedByCall) {
      if (now - state.failure.at > retryMs() && state.failure.kind === "credit") state.failure = null;   // try again after a while
      else return false;
    }
  }
  return state.probe ? state.probe.ok : true;
}

export function noteAiFailure(kind: AiErrorKind, detail: string, now = Date.now()): void {
  if (!DOWN_KINDS.includes(kind) && !aiMock()) return;
  state.failure = { at: now, kind, detail };
  // A rejected key: look again soon rather than waiting for the long OK cache to expire.
  if (kind === "auth" && state.probe?.ok) state.probe = { ...state.probe, checkedAt: 0 };
  persist();
}

export function noteAiSuccess(now = Date.now()): void {
  state.lastOkAt = now;
  if (state.failure && state.failure.kind !== "auth") state.failure = null;
}

function persist(): void {
  try { setSetting("ai_health", JSON.stringify({ probe: state.probe, failure: state.failure })); } catch { /* the db may not be ready during build */ }
}

/** For the admin panel. */
export function aiHealthSnapshot(): { ready: boolean; probe: AiHealth | null; lastFailure: LastFailure | null; stored: unknown } {
  let stored: unknown = null;
  try { stored = JSON.parse(getSetting("ai_health") ?? "null"); } catch {}
  return { ready: aiReady(), probe: state.probe, lastFailure: state.failure, stored };
}

/** Test hooks: background probes never reach the network in unit tests. */
export function __setProbeFetch(fn: FetchLike): void { defaultFetch = fn; }
export function __resetAiHealth(): void {
  state.probe = null; state.inflight = null; state.failure = null; state.lastOkAt = 0;
}
