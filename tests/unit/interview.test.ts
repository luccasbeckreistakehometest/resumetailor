import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { aggregate, buildQuestions, overallOf, MAX_QUESTIONS, PREVIEW_QUESTIONS, type Turn } from "@/lib/interview/logic";
import { mockAnswerScore } from "@/lib/ai/interview";

// Own database directory: unit files run in parallel workers and must not wipe each other's file.
const DIR = path.join(process.cwd(), "data", "unit-interview");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { createUser, claimAnonymous } = await import("@/lib/server/users");
const { saveGeneration, unlockGeneration } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { createSession, appendTurn, finishSession, getSession, listSessions, ownsSession, countSessionsForKit, serialiseSession } = await import("@/lib/server/interviews");

const kit = mockKit({ mode: "tailor", targetRole: "Growth Lead", lang: "en", resume: "x", jobDescription: "y" });
const turn = (questionIdx: number, s: [number, number, number]): Turn =>
  ({ questionIdx, answer: "a", source: "text", scores: { structure: s[0], specificity: s[1], relevance: s[2] }, coaching: [], modelAnswer: "", at: "2026-01-01T00:00:00.000Z" });

describe("questions", () => {
  it("opens with the role, frames topics as STAR questions, and passes real questions through", () => {
    const qs = buildQuestions({ interviewPrep: { ...kit.interviewPrep, behavioral: ["A campaign that failed and what you changed", "How do you handle a disagreement with sales?"], technical: ["Attribution models"] } }, "Growth Lead", "en", false);
    expect(qs[0].kind).toBe("opener");
    expect(qs[0].text).toContain("Growth Lead");
    expect(qs[1].text).toMatch(/^Tell me about a specific situation — a campaign that failed/);
    expect(qs[2].text).toBe("How do you handle a disagreement with sales?");
    expect(qs[3].kind).toBe("technical");
    expect(qs[3].text).toContain("attribution models");
  });

  it("writes the opener in the kit's language", () => {
    expect(buildQuestions(kit, "Analista", "pt", false)[0].text).toMatch(/^Pra começar/);
    expect(buildQuestions(kit, "Analista", "es", false)[0].text).toMatch(/^Para empezar/);
  });

  it("gives a locked kit a two-question preview and caps the full interview", () => {
    expect(buildQuestions(kit, "Growth Lead", "en", true)).toHaveLength(PREVIEW_QUESTIONS);
    const many = { interviewPrep: { ...kit.interviewPrep, behavioral: Array.from({ length: 6 }, (_, i) => `story ${i}`), technical: Array.from({ length: 6 }, (_, i) => `topic ${i}`) } };
    expect(buildQuestions(many, "Growth Lead", "en", false)).toHaveLength(MAX_QUESTIONS);
  });

  it("skips blank items", () => {
    const qs = buildQuestions({ interviewPrep: { ...kit.interviewPrep, behavioral: ["", "  "], technical: [] } }, "", "en", false);
    expect(qs).toHaveLength(1);
    expect(qs[0].text).toContain("this role");
  });
});

describe("aggregation", () => {
  it("averages each dimension, names the weakest, and rounds to one decimal", () => {
    const a = aggregate([turn(0, [8, 4, 7]), turn(1, [6, 5, 9])]);
    expect(a.answered).toBe(2);
    expect(a.averages).toEqual({ structure: 7, specificity: 4.5, relevance: 8 });
    expect(a.weakest).toBe("specificity");
    expect(a.perQuestion.map((q) => q.overall)).toEqual([6.3, 6.7]);
    expect(a.overall).toBe(6.5);
  });

  it("breaks ties towards structure first, and is empty-safe", () => {
    expect(aggregate([turn(0, [5, 5, 5])]).weakest).toBe("structure");
    expect(aggregate([turn(0, [5, 3, 3])]).weakest).toBe("specificity");
    const empty = aggregate([]);
    expect(empty.weakest).toBeNull();
    expect(empty.overall).toBe(0);
  });

  it("scores a full, number-bearing answer higher than a thin one in mock mode", () => {
    const thin = mockAnswerScore({ question: { kind: "opener", text: "q" }, answer: "I did some marketing stuff.", targetRole: "x", background: "", lang: "en" });
    const full = mockAnswerScore({ question: { kind: "opener", text: "q" }, answer: "At Acme I led a team of 4 and grew qualified pipeline 38% in 12 months by rebuilding segmentation and running weekly A/B tests across 3 markets, then handed the playbook to sales.", targetRole: "x", background: "", lang: "en" });
    expect(overallOf(full.scores)).toBeGreaterThan(overallOf(thin.scores));
    expect(full.coaching).toHaveLength(3);
  });
});

describe("sessions", () => {
  let n = 0;
  const user = () => createUser({ email: `i${++n}@example.com`, password: "password123" });
  const gen = (userId: string | null, anonId: string | null) => saveGeneration({ userId, anonId, mode: "tailor", source: "text", lang: "pt", targetRole: "Analista", input: {}, kit, model: "mock", costUsd: 0 });

  it("previews a locked kit and runs the full interview once unlocked", () => {
    const u = user();
    const g = gen(u.id, null);
    const preview = createSession({ userId: u.id, anonId: null, generation: g, model: "mock" });
    expect(preview.mode).toBe("preview");
    expect(JSON.parse(preview.questions)).toHaveLength(PREVIEW_QUESTIONS);
    expect(preview.lang).toBe("pt");
    unlockGeneration(g.id, u.id);
    const full = createSession({ userId: u.id, anonId: null, generation: { ...g, unlocked: 1 }, model: "mock" });
    expect(full.mode).toBe("full");
    expect(JSON.parse(full.questions).length).toBeGreaterThan(PREVIEW_QUESTIONS);
    expect(countSessionsForKit(g.id, u.id, undefined)).toBe(2);
  });

  it("appends turns in order, sums cost, and closes with a summary", () => {
    const u = user();
    const s = createSession({ userId: u.id, anonId: null, generation: gen(u.id, null), model: "mock" });
    appendTurn(s.id, turn(0, [7, 6, 8]), 0.01);
    const after = appendTurn(s.id, turn(1, [5, 4, 6]), 0.02);
    expect(JSON.parse(after.turns)).toHaveLength(2);
    expect(after.costUsd).toBeCloseTo(0.03);
    const done = finishSession(s.id, { rehearse: ["a", "b", "c"], overall: "ok" }, 0.005);
    expect(done.status).toBe("done");
    expect(done.completedAt).toBeTruthy();
    const view = serialiseSession(done, { title: "T", targetRole: "R" });
    expect(view.aggregate.answered).toBe(2);
    expect(view.aggregate.weakest).toBe("specificity");
    expect(view.summary?.rehearse).toHaveLength(3);
  });

  it("never lets another user see or count a session", () => {
    const a = user(), b = user();
    const s = createSession({ userId: a.id, anonId: null, generation: gen(a.id, null), model: "mock" });
    expect(ownsSession(s, b.id, undefined)).toBe(false);
    expect(ownsSession(s, a.id, undefined)).toBe(true);
    expect(listSessions(b.id, undefined)).toHaveLength(0);
    expect(listSessions(a.id, undefined).map((r) => r.id)).toContain(s.id);
  });

  it("anonymous sessions follow the kit into the new account", () => {
    const anon = "anon_interview";
    const g = gen(null, anon);
    const s = createSession({ userId: null, anonId: anon, generation: g, model: "mock" });
    expect(ownsSession(s, null, anon)).toBe(true);
    const u = user();
    claimAnonymous(u.id, anon);
    expect(getSession(s.id)!.userId).toBe(u.id);
    expect(ownsSession(getSession(s.id)!, null, anon)).toBe(false);
    expect(listSessions(u.id, undefined)).toHaveLength(1);
  });
});
