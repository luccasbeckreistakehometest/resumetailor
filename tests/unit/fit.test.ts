import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canonical, fitScore, fitVerdict, mockFit, topGaps, type FitItem } from "@/lib/fit/logic";

// Own database directory and a tiny daily cap, set before the server module loads.
const DIR = path.join(process.cwd(), "data", "unit-fit");
process.env.DATA_DIR = DIR;
process.env.FIT_CHECKS_PER_DAY = "2";
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser } = await import("@/lib/server/users");
const { saveGeneration } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { FIT_DAILY_LIMIT, fitHash, fitUsage, getCachedFit, lastTailorInputs, saveFit, serialiseFit } = await import("@/lib/server/fit");

const item = (requirement: string, weight: FitItem["weight"], status: FitItem["status"]): FitItem => ({ requirement, weight, status, evidence: status === "missing" ? "" : `line about ${requirement}`, advice: "" });

const POSTING = `Growth Marketing Manager\nRequirements: HubSpot, HubSpot workflows, HubSpot reporting; SQL and SQL dashboards; Salesforce, Salesforce admin, Salesforce reporting. A/B testing. Team leadership.`;
const RESUME = `Alex Ribeiro\n- Ran lifecycle campaigns in HubSpot, growing pipeline 38%\n- Built SQL dashboards for the sales team\n- Led a team of four`;

describe("scoring", () => {
  it("weights must-haves three times a nice-to-have and gives half credit to partial evidence", async () => {
    expect(fitScore([item("a", "critical", "found"), item("b", "nice", "missing")])).toBe(75);
    expect(fitScore([item("a", "critical", "partial"), item("b", "important", "found")])).toBe(70);
    expect(fitScore([item("a", "important", "found"), item("b", "important", "found")])).toBe(100);
    expect(fitScore([item("a", "critical", "missing")])).toBe(0);
    expect(fitScore([])).toBe(0);
  });
  it("names the verdict by threshold", async () => {
    expect(fitVerdict(80)).toBe("strong"); expect(fitVerdict(79)).toBe("good"); expect(fitVerdict(60)).toBe("good");
    expect(fitVerdict(59)).toBe("stretch"); expect(fitVerdict(40)).toBe("stretch"); expect(fitVerdict(39)).toBe("weak");
  });
  it("ranks the gaps by weight, then missing before partial, and stops at three", async () => {
    const gaps = topGaps([item("n-miss", "nice", "missing"), item("c-part", "critical", "partial"), item("i-miss", "important", "missing"), item("c-miss", "critical", "missing"), item("ok", "critical", "found"), item("i-part", "important", "partial")]);
    expect(gaps.map((g) => g.requirement)).toEqual(["c-miss", "c-part", "i-miss"]);
    expect(topGaps([item("ok", "critical", "found")])).toEqual([]);
  });
});

describe("cache key", () => {
  it("ignores spacing and casing but not the language or the text", async () => {
    expect(canonical("  HubSpot\n\n  SQL ")).toBe("hubspot sql");
    expect(fitHash("Posting A", "Résumé B", "en")).toBe(fitHash("posting   a", "résumé b", "en"));
    expect(fitHash("Posting A", "Résumé B", "en")).not.toBe(fitHash("Posting A", "Résumé B", "pt"));
    expect(fitHash("Posting A", "Résumé B", "en")).not.toBe(fitHash("Posting A", "Résumé C", "en"));
  });
});

describe("fixture", () => {
  it("reflects the real inputs: the posting's repeated terms, found where the résumé has them", async () => {
    const r = mockFit(POSTING, RESUME, "pt");
    expect(r.role).toBe("Growth Marketing Manager");
    const by = Object.fromEntries(r.items.map((i) => [i.requirement, i]));
    expect(by.hubspot.status).toBe("found");
    expect(by.hubspot.evidence).toContain("HubSpot");
    expect(by.salesforce.status).toBe("missing");
    expect(by.salesforce.evidence).toBe("");
    expect(by.salesforce.advice).toMatch(/não finge/);
    expect(r.items.length).toBeGreaterThanOrEqual(6);
    expect(fitScore(r.items)).toBeGreaterThan(0);
    expect(fitScore(r.items)).toBeLessThan(100);
  });
});

describe("cache and daily cap", () => {
  const analysis = mockFit(POSTING, RESUME, "en");
  it("stores one row per hash and serves it back to anyone without counting", async () => {
    const hash = fitHash(POSTING, RESUME, "en");
    expect(getCachedFit(hash)).toBeNull();
    const row = saveFit({ ownerKey: "anon_a", hash, lang: "en", result: analysis, model: "mock", costUsd: 0 });
    expect(getCachedFit(hash)!.id).toBe(row.id);
    const again = saveFit({ ownerKey: "anon_b", hash, lang: "en", result: analysis, model: "mock", costUsd: 0 });
    expect(again.id).toBe(row.id);
    expect(fitUsage("anon_b").used).toBe(0);
    expect(fitUsage("anon_a").used).toBe(1);
    const view = serialiseFit(row, true, fitUsage("anon_b"));
    expect(view.cached).toBe(true);
    expect(view.gaps.length).toBeLessThanOrEqual(3);
    expect(view.score).toBe(fitScore(analysis.items));
  });
  it("counts only new pairs within the rolling day, and says when the window frees up", async () => {
    expect(FIT_DAILY_LIMIT).toBe(2);
    saveFit({ ownerKey: "anon_c", hash: "h1", lang: "en", result: analysis, model: "mock", costUsd: 0 });
    expect(fitUsage("anon_c")).toMatchObject({ used: 1, left: 1 });
    saveFit({ ownerKey: "anon_c", hash: "h2", lang: "en", result: analysis, model: "mock", costUsd: 0 });
    const u = fitUsage("anon_c");
    expect(u).toMatchObject({ used: 2, left: 0 });
    expect(u.resetsAt).toBeTruthy();
    expect(fitUsage("anon_c", Date.now() + 25 * 3_600_000)).toMatchObject({ used: 0, left: 2, resetsAt: null });
  });
});

describe("reusing the last kit's inputs", () => {
  it("returns the caller's newest tailored kit only, never another person's", async () => {
    const a = await createUser({ email: "fit-a@example.com", password: "password123" });
    const b = await createUser({ email: "fit-b@example.com", password: "password123" });
    const kit = mockKit({ mode: "tailor", targetRole: "Growth Lead", lang: "en", resume: RESUME, jobDescription: POSTING });
    saveGeneration({ userId: a.id, anonId: null, mode: "improve", source: "text", lang: "en", targetRole: "x", input: { resume: RESUME }, kit, model: "mock", costUsd: 0 });
    expect(lastTailorInputs(a.id, undefined)).toBeNull();
    saveGeneration({ userId: a.id, anonId: null, mode: "tailor", source: "text", lang: "en", targetRole: "Growth Lead", input: { jobDescription: POSTING, resume: RESUME }, kit, model: "mock", costUsd: 0 });
    expect(lastTailorInputs(a.id, undefined)).toEqual({ targetRole: "Growth Lead", posting: POSTING, resume: RESUME });
    expect(lastTailorInputs(b.id, undefined)).toBeNull();
    saveGeneration({ userId: null, anonId: "anon_fit", mode: "tailor", source: "text", lang: "pt", targetRole: "Analista", input: { jobDescription: "vaga ".repeat(10), resume: RESUME }, kit, model: "mock", costUsd: 0 });
    expect(lastTailorInputs(null, "anon_fit")?.targetRole).toBe("Analista");
    expect(lastTailorInputs(null, "anon_other")).toBeNull();
  });
});
