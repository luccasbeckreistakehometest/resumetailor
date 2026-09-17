import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "unit-ai");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const health = await import("@/lib/ai/health");
const { classifyAiError, MockAiDown } = await import("@/lib/ai/client");
const spend = await import("@/lib/server/spend");
const { runAi, aiGate } = await import("@/lib/ai/guard");
const tts = await import("@/lib/server/tts");
const { getDb } = await import("@/lib/server/db");
const { extra } = await import("@/app/i18n/extra");

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined) => { if (!(k in saved)) saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; };
afterEach(() => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; delete saved[k]; } health.__resetAiHealth(); });
beforeEach(() => { setEnv("AI_MOCK", undefined); setEnv("ANTHROPIC_API_KEY", "sk-ant-api03-" + "x".repeat(40)); });

const fake = (status: number) => async () => ({ status, ok: status >= 200 && status < 300 });
let background = 0;
health.__setProbeFetch(async () => { background++; return { status: 200, ok: true }; });

describe("AI health", () => {
  it("a rejected key makes the AI unavailable; a working one is ready", async () => {
    expect((await health.probeAi(fake(401))).ok).toBe(false);
    expect(health.aiReady()).toBe(false);
    expect((await health.probeAi(fake(200))).ok).toBe(true);
    expect(health.aiReady()).toBe(true);
  });

  it("a placeholder or missing key is never ready", async () => {
    setEnv("ANTHROPIC_API_KEY", "sk-ant-...");
    expect((await health.probeAi(fake(200))).reason).toBe("no_key");
    expect(health.aiReady()).toBe(false);
  });

  it("an empty credit balance marks the AI down even though the key probe passes, until a call succeeds", async () => {
    await health.probeAi(fake(200));
    const { kind, detail } = classifyAiError(new Error("Your credit balance is too low to access the Anthropic API"));
    expect(kind).toBe("credit");
    health.noteAiFailure(kind, detail);
    expect(health.aiReady()).toBe(false);
    health.noteAiSuccess();
    expect(health.aiReady()).toBe(true);
  });

  it("a rejected key during a generation marks it down until a fresh probe passes", async () => {
    const now = Date.now();
    await health.probeAi(fake(200), now - 1000);
    health.noteAiFailure("auth", "401", now);
    expect(health.aiReady(now + 10)).toBe(false);
    await health.probeAi(fake(200), now + 20);
    expect(health.aiReady(now + 30)).toBe(true);
    expect(background).toBeGreaterThan(0);   // the failure scheduled a re-probe (stubbed here, never the network)
  });

  it("classifies operator detail without leaking it to users", () => {
    expect(classifyAiError(new MockAiDown()).kind).toBe("auth");
    expect(classifyAiError(new Error("rate_limit_error: slow down")).kind).toBe("rate");
    expect(classifyAiError(new Error("incomplete: truncated")).kind).toBe("incomplete");
  });
});

describe("spend ceiling and the AI gate", () => {
  it("records every call and pauses AI once today's spend reaches the ceiling", async () => {
    await health.probeAi(fake(200));
    setEnv("AI_DAILY_BUDGET_USD", "0.05");
    expect(aiGate({ ownerKey: "o1" })).toBeNull();
    const ok = await runAi("unit", { ownerKey: "o1", ip: "1.1.1.1" }, async () => ({ costUsd: 0.03, model: "m" }));
    expect(ok.ok).toBe(true);
    expect(spend.spentToday()).toBeCloseTo(0.03, 5);
    const failed = await runAi("unit", { ownerKey: "o1" }, async () => { throw new Error("rate limit exceeded"); });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.reply).toMatchObject({ status: 503, body: { error: "ai_busy" } });
    expect(spend.recentAiErrors().some((e) => e.feature === "unit" && /rate/.test(e.error ?? ""))).toBe(true);
    await runAi("unit", {}, async () => ({ costUsd: 0.03 }));
    expect(spend.overBudget()).toBe(true);
    const blocked = await runAi("unit", {}, async () => ({ costUsd: 0 }));
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reply).toMatchObject({ status: 503, body: { error: "ai_busy" } });
    setEnv("AI_DAILY_BUDGET_USD", "1000");
    expect(aiGate({ ownerKey: "o1" })).toBeNull();
  });

  it("anonymous visitors stop at their own slice of the budget; signed-in people keep the rest", async () => {
    await health.probeAi(fake(200));
    getDb().prepare("DELETE FROM ai_usage").run();
    setEnv("AI_DAILY_BUDGET_USD", "1");
    setEnv("AI_ANON_DAILY_BUDGET_USD", undefined);
    expect(spend.anonDailyBudget()).toBeCloseTo(0.2, 5);          // a fifth of the ceiling by default
    const anon = { ownerKey: "anon_abc123", ip: "9.9.9.9" };
    for (let i = 0; i < 4; i++) expect((await runAi("fit", anon, async () => ({ costUsd: 0.05 }))).ok).toBe(true);
    // 0.20 spent by visitors without an account: they are paused, a signed-in user is not.
    expect(aiGate(anon)).toMatchObject({ status: 503, body: { error: "ai_busy" } });
    expect(aiGate({ ownerKey: "anon_someone_else" })).toMatchObject({ status: 503 });
    expect(aiGate({})).toMatchObject({ status: 503 });
    expect(aiGate({ ownerKey: "usr_paying" })).toBeNull();
    expect(spend.spentTodayAnonymous()).toBeCloseTo(0.2, 5);
    expect((await runAi("generate", { ownerKey: "usr_paying" }, async () => ({ costUsd: 0.5 }))).ok).toBe(true);
    expect(spend.spentTodayAnonymous()).toBeCloseTo(0.2, 5);      // signed-in spend is not in the anonymous slice
    // The overall ceiling still applies to everyone.
    expect((await runAi("generate", { ownerKey: "usr_paying" }, async () => ({ costUsd: 0.3 }))).ok).toBe(true);
    expect(aiGate({ ownerKey: "usr_paying" })).toMatchObject({ status: 503, body: { error: "ai_busy" } });
    // An explicit slice is honoured, never above the ceiling; a negative one removes it.
    setEnv("AI_ANON_DAILY_BUDGET_USD", "5");
    expect(spend.anonDailyBudget()).toBe(1);
    setEnv("AI_ANON_DAILY_BUDGET_USD", "-1");
    setEnv("AI_DAILY_BUDGET_USD", "100");
    expect(aiGate(anon)).toBeNull();
    // Company-search costs are recorded with the insights call.
    const { tavilyCost } = await import("@/lib/ai/insights");
    expect(tavilyCost(3)).toBeCloseTo(0.024, 5);
  });

  it("a dead key answers ai_unavailable without calling the model", async () => {
    await health.probeAi(fake(401));
    let called = false;
    const res = await runAi("unit", {}, async () => { called = true; return { costUsd: 0 }; });
    expect(called).toBe(false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reply).toMatchObject({ status: 503, body: { error: "ai_unavailable" } });
  });
});

describe("text-to-speech guard", () => {
  it("speaks only the app's own prompts for this visitor", () => {
    const owner = { userId: null, anonId: "anon_tts_1" };
    expect(tts.isAppPrompt(extra.pt.voice.opener, owner)).toBe(true);
    expect(tts.isAppPrompt("Read this ad for my company, please", owner)).toBe(false);
    const db = getDb();
    db.prepare("INSERT INTO voice_briefings (id,ownerId,lang,transcript,extracted,createdAt) VALUES (?,?,?,?,?,?)")
      .run("vb_tts", "anon_tts_1", "en", "hi", JSON.stringify({ followUp: "What did you study?" }), new Date().toISOString());
    expect(tts.isAppPrompt("What did you study?", owner)).toBe(true);
    expect(tts.isAppPrompt("What did you study?", { userId: null, anonId: "anon_someone_else" })).toBe(false);
  });

  it("evicts the least recently used files past the size cap", () => {
    const a = tts.cacheKey("p", "en", "a"), b = tts.cacheKey("p", "en", "b"), c = tts.cacheKey("p", "en", "c");
    setEnv("TTS_CACHE_MAX_MB", "1000");
    tts.writeCached(a, Buffer.alloc(100), 1);
    tts.writeCached(b, Buffer.alloc(100), 2);
    tts.writeCached(c, Buffer.alloc(100), 3);
    expect(tts.readCached(a, 4)).not.toBeNull();       // a is now the most recent
    expect(tts.evict(250)).toBe(1);                     // b goes first
    expect(tts.readCached(b)).toBeNull();
    expect(tts.readCached(a)).not.toBeNull();
    expect(tts.readCached(c)).not.toBeNull();
  });

  it("is silent with no provider or a commented-out key", () => {
    setEnv("ELEVENLABS_API_KEY", "# preferred: elevenlabs.io → multilingual, natural pt-BR");
    setEnv("OPENAI_API_KEY", undefined);
    expect(tts.ttsProvider()).toBeNull();
  });
});
