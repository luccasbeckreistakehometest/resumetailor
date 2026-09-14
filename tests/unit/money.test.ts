import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// A fresh database per run: these tests are about the invariants that guard real money.
const DIR = path.join(process.cwd(), "data", "unit");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser, moveCredits, findById, claimAnonymous, SIGNUP_CREDITS } = await import("@/lib/server/users");
const { settlePayment } = await import("@/lib/server/payments");
const { saveGeneration, unlockGeneration, getGeneration, listGenerations } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { signSession, verifySession, hashPassword, verifyPassword } = await import("@/lib/server/auth");

let n = 0;
const user = () => createUser({ email: `t${++n}@example.com`, password: "password123" });

describe("credits", () => {
  it("grants the signup credit and records it in the ledger", () => {
    const u = user();
    expect(u.credits).toBe(SIGNUP_CREDITS);
  });

  it("refuses to go negative", () => {
    const u = user();
    expect(() => moveCredits(u.id, -2, "unlock", null)).toThrow(/insufficient/);
    expect(findById(u.id)!.credits).toBe(SIGNUP_CREDITS);
  });
});

describe("payments", () => {
  it("grants exactly once for the same provider payment id", () => {
    const u = user();
    const args = { provider: "stripe" as const, externalId: "cs_test_1", userId: u.id, pack: "5", credits: 5, amount: 35, currency: "USD", status: "approved" as const };
    expect(settlePayment(args).granted).toBe(true);
    // the webhook and the success-page fallback both fire for one purchase
    expect(settlePayment(args).granted).toBe(false);
    expect(findById(u.id)!.credits).toBe(SIGNUP_CREDITS + 5);
  });

  it("holds pending payments without credits and settles them later", () => {
    const u = user();
    const base = { provider: "mercadopago" as const, externalId: "mp_9", userId: u.id, pack: "1", credits: 1, amount: 39, currency: "BRL" };
    expect(settlePayment({ ...base, status: "pending" }).granted).toBe(false);
    expect(findById(u.id)!.credits).toBe(SIGNUP_CREDITS);
    expect(settlePayment({ ...base, status: "approved" }).granted).toBe(true);
    expect(findById(u.id)!.credits).toBe(SIGNUP_CREDITS + 1);
  });
});

describe("kits", () => {
  const kit = mockKit({ mode: "build", targetRole: "Analyst", lang: "en", profile: "x" });

  it("unlocks once, spends one credit, and refuses a second spend", () => {
    const u = user();
    const g = saveGeneration({ userId: u.id, anonId: null, mode: "build", source: "text", lang: "en", targetRole: "Analyst", input: {}, kit, model: "mock", costUsd: 0 });
    expect(unlockGeneration(g.id, u.id)).toEqual({ ok: true, credits: 0 });
    expect(unlockGeneration(g.id, u.id)).toEqual({ ok: false, reason: "already" });
    expect(getGeneration(g.id)!.unlocked).toBe(1);
  });

  it("fails cleanly with no credits and does not open the kit", () => {
    const u = user();
    moveCredits(u.id, -SIGNUP_CREDITS, "unlock", null);
    const g = saveGeneration({ userId: u.id, anonId: null, mode: "build", source: "text", lang: "en", targetRole: "Analyst", input: {}, kit, model: "mock", costUsd: 0 });
    expect(unlockGeneration(g.id, u.id)).toEqual({ ok: false, reason: "insufficient" });
    expect(getGeneration(g.id)!.unlocked).toBe(0);
  });

  it("cannot unlock someone else's kit", () => {
    const a = user(), b = user();
    const g = saveGeneration({ userId: a.id, anonId: null, mode: "build", source: "text", lang: "en", targetRole: "Analyst", input: {}, kit, model: "mock", costUsd: 0 });
    expect(unlockGeneration(g.id, b.id)).toEqual({ ok: false, reason: "missing" });
  });

  it("anonymous work is claimed on signup", () => {
    const anon = "anon_abc";
    saveGeneration({ userId: null, anonId: anon, mode: "build", source: "voice", lang: "pt", targetRole: "Analista", input: {}, kit, model: "mock", costUsd: 0 });
    const u = user();
    claimAnonymous(u.id, anon);
    expect(listGenerations(u.id, undefined)).toHaveLength(1);
    expect(listGenerations(null, anon)).toHaveLength(0);
  });
});

describe("auth", () => {
  it("round-trips a session and rejects a tampered one", () => {
    const token = signSession({ userId: "u1", role: "user" });
    expect(verifySession(token)?.userId).toBe("u1");
    expect(verifySession(token.slice(0, -2) + "xx")).toBeNull();
  });
  it("hashes passwords with a per-user salt", () => {
    const a = hashPassword("password123"), b = hashPassword("password123");
    expect(a).not.toEqual(b);
    expect(verifyPassword("password123", a)).toBe(true);
    expect(verifyPassword("password124", a)).toBe(false);
  });
});
