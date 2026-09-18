import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "unit-anon");
process.env.DATA_DIR = DIR;
process.env.AUTH_SECRET = "unit-anon-secret-long-enough-to-pass-0000";
fs.rmSync(DIR, { recursive: true, force: true });

const { newAnonId, readAnonCookie, signAnonId } = await import("@/lib/server/auth");
const { anonHasWork } = await import("@/lib/server/anon");
const spend = await import("@/lib/server/spend");
const { runAi } = await import("@/lib/ai/guard");
const health = await import("@/lib/ai/health");
const { getDb, nowIso } = await import("@/lib/server/db");
const { clientIp } = await import("@/lib/server/ratelimit");

const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined) => { if (!(k in saved)) saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; };
const visitor = (key: string) => ({ userId: null, key, ip: "1.1.1.1" });
const member = (key: string) => ({ userId: key, key, ip: "1.1.1.1" });

describe("the visitor cookie is minted here, or it is not believed", () => {
  it("accepts what we signed and refuses what a caller invented", () => {
    const id = newAnonId();
    expect(id).toMatch(/^anon_[0-9a-f]{24}$/);
    const cookie = signAnonId(id);
    expect(readAnonCookie(cookie)).toEqual({ id, signed: true });
    // The values that used to sail straight through as an owner key.
    for (const forged of ["zz", "usr_1", "Anon_x", "anon_", "anon_nothex000000000000000", `${id}.`, `${id}.wrong`, "", undefined]) {
      expect(readAnonCookie(forged as string | undefined), String(forged)).toBeNull();
    }
    // Nor can a signature be moved onto another id.
    const other = newAnonId();
    expect(readAnonCookie(`${other}.${signAnonId(id).split(".")[1]}`)).toBeNull();
  });

  it("still knows a well-formed id from before signing, but only while it owns work", () => {
    const legacy = newAnonId();
    expect(readAnonCookie(legacy)).toEqual({ id: legacy, signed: false });
    expect(anonHasWork(legacy)).toBe(false);
    getDb().prepare("INSERT INTO generations (id,userId,anonId,mode,source,lang,title,targetRole,input,result,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run("gen_legacy", null, legacy, "tailor", "text", "en", "t", "Analyst", "{}", "{}", nowIso());
    expect(anonHasWork(legacy)).toBe(true);
    expect(anonHasWork(newAnonId())).toBe(false);
  });
});

describe("the AI budget is reserved, not checked after the fact", () => {
  beforeEach(async () => {
    getDb().prepare("DELETE FROM ai_usage").run();
    setEnv("AI_MOCK", undefined);
    setEnv("ANTHROPIC_API_KEY", "sk-ant-api03-" + "x".repeat(40));
    await health.probeAi(async () => ({ status: 200, ok: true }));
  });

  it("a burst of parallel calls cannot all sail past the ceiling", async () => {
    setEnv("AI_DAILY_BUDGET_USD", "25");
    setEnv("AI_ANON_DAILY_BUDGET_USD", "-1");
    setEnv("AI_CALL_ESTIMATE_USD", "0.05");
    // $24.90 already spent today: ten cents of headroom.
    getDb().prepare("INSERT INTO ai_usage (id,feature,ownerKey,ip,isAnon,model,costUsd,ok,error,pending,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run("ai_seed", "generate", "usr_1", "1.1.1.1", 0, "m", 24.9, 1, null, 0, nowIso());
    let ran = 0;
    const calls = Array.from({ length: 12 }, () => runAi("generate", member("usr_1"), async () => {
      ran++;
      await new Promise((r) => setTimeout(r, 5));       // the model call, during which the others arrive
      return { costUsd: 0.2, model: "m" };
    }));
    const results = await Promise.all(calls);
    const admitted = results.filter((r) => r.ok).length;
    expect(admitted).toBeLessThanOrEqual(2);            // the one that crosses the line, and no more
    expect(ran).toBe(admitted);                         // a refused call never reaches the model
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reply.status === 503)).toBe(true);
    // The holds settled at the real cost, so tomorrow's arithmetic is not the estimate.
    expect(getDb().prepare("SELECT COUNT(*) n FROM ai_usage WHERE pending = 1").get()).toEqual({ n: 0 });
    expect(spend.spentToday()).toBeCloseTo(24.9 + admitted * 0.2, 5);
  });

  it("a failed call still costs the floor, and an abandoned hold settles itself", async () => {
    setEnv("AI_DAILY_BUDGET_USD", "10");
    setEnv("AI_FAILED_CALL_FLOOR_USD", "0.004");
    const failed = await runAi("generate", member("usr_1"), async () => { throw new Error("boom"); });
    expect(failed.ok).toBe(false);
    expect(spend.spentToday()).toBeCloseTo(0.004, 5);
    // A hold whose process died: counted while it might still be running, then settled at the floor.
    const held = spend.reserveSpend({ feature: "generate", ownerKey: "usr_1", ip: "1.1.1.1", anonymous: false, estimateUsd: 1 });
    expect(held.ok).toBe(true);
    expect(spend.spentToday()).toBeCloseTo(1.004, 5);
    spend.sweepStaleHolds(Date.now() + 11 * 60 * 1000);
    expect(spend.spentToday()).toBeCloseTo(0.008, 5);
  });

  it("counts the anonymous slice from having no account, not from the shape of the key", async () => {
    setEnv("AI_DAILY_BUDGET_USD", "10");
    setEnv("AI_ANON_DAILY_BUDGET_USD", "0.2");
    setEnv("AI_CALL_ESTIMATE_USD", "0.01");
    // Whatever a visitor calls themselves, their spend lands in the anonymous slice…
    for (const key of ["anon_abc", "zz", "usr_1", "Anon_x"]) {
      expect((await runAi("fit", visitor(key), async () => ({ costUsd: 0.05, model: "m" }))).ok).toBe(true);
    }
    expect(spend.spentTodayAnonymous()).toBeCloseTo(0.2, 5);
    // …and closes the door on the next visitor, whatever they call themselves.
    for (const key of ["anon_abc", "zz", "usr_1"]) {
      const blocked = await runAi("fit", visitor(key), async () => ({ costUsd: 0.05, model: "m" }));
      expect(blocked.ok, key).toBe(false);
    }
    // A signed-in account keeps the rest of the budget.
    expect((await runAi("generate", member("usr_paying"), async () => ({ costUsd: 0.05, model: "m" }))).ok).toBe(true);
    expect(spend.spentTodayAnonymous()).toBeCloseTo(0.2, 5);
  });
});

describe("the client address behind the proxy", () => {
  const h = (v: Record<string, string>) => new Headers(v);
  it("reads the entry the trusted hop count points at", () => {
    setEnv("TRUSTED_PROXY_HOPS", undefined);
    // Production today: Caddy replaces the header, so there is exactly one entry.
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    // A caller who sends their own list gets no say: with no trusted hop, the entry Caddy wrote
    // is the only one there — and if one ever arrives, we do not silently read the far end.
    expect(clientIp(h({ "x-forwarded-for": "10.0.0.1, 10.0.0.2, 203.0.113.7" }))).toBe("203.0.113.7");
    setEnv("TRUSTED_PROXY_HOPS", "1");
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 172.16.0.9" }))).toBe("203.0.113.7");
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");   // never past the start
    setEnv("TRUSTED_PROXY_HOPS", undefined);
    expect(clientIp(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(h({}))).toBe("local");
  });
});
