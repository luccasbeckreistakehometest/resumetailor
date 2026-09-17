import { createHash } from "node:crypto";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { canonical, fitScore, fitVerdict, topGaps, type FitAnalysis } from "@/lib/fit/logic";

export interface FitRow { id: string; ownerKey: string; hash: string; lang: string; role: string; result: string; model: string; costUsd: number; createdAt: string }

/** AI calls per person per rolling day. Cache hits are free and never count. Override per deployment. */
export const FIT_DAILY_LIMIT = Number(process.env.FIT_CHECKS_PER_DAY ?? 5);
const DAY_MS = 86_400_000;

/** Same posting + résumé + language → same key, whatever the spacing or casing. */
export const fitHash = (posting: string, resume: string, lang: string) =>
  createHash("sha256").update(`${lang}\n${canonical(posting)}\n${canonical(resume)}`).digest("hex");

export function getCachedFit(hash: string): FitRow | null {
  return (getDb().prepare("SELECT * FROM fit_checks WHERE hash = ?").get(hash) as FitRow) ?? null;
}

export function saveFit(input: { ownerKey: string; hash: string; lang: string; result: FitAnalysis; model: string; costUsd: number }): FitRow {
  const id = newId("fit");
  getDb().prepare("INSERT INTO fit_checks (id,ownerKey,hash,lang,role,result,model,costUsd,createdAt) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(hash) DO NOTHING")
    .run(id, input.ownerKey, input.hash, input.lang, input.result.role, JSON.stringify(input.result), input.model, input.costUsd, nowIso());
  return getCachedFit(input.hash)!;
}

/** How many AI-costing checks this person ran in the last 24 hours, and when the oldest one drops out of the window. */
export function fitUsage(ownerKey: string, now = Date.now()): { used: number; left: number; resetsAt: string | null } {
  const since = new Date(now - DAY_MS).toISOString();
  const rows = getDb().prepare("SELECT createdAt FROM fit_checks WHERE ownerKey = ? AND createdAt >= ? ORDER BY createdAt ASC").all(ownerKey, since) as { createdAt: string }[];
  const used = rows.length;
  return { used, left: Math.max(0, FIT_DAILY_LIMIT - used), resetsAt: rows[0] ? new Date(new Date(rows[0].createdAt).getTime() + DAY_MS).toISOString() : null };
}

/** The caller's most recent kit tailored to a posting: what "reuse my last inputs" fills in. Never anyone else's. */
export function lastTailorInputs(userId: string | null, anonId: string | undefined): { targetRole: string; posting: string; resume: string } | null {
  const db = getDb();
  const row = (userId
    ? db.prepare("SELECT targetRole, input FROM generations WHERE userId = ? AND mode = 'tailor' ORDER BY createdAt DESC LIMIT 1").get(userId)
    : anonId ? db.prepare("SELECT targetRole, input FROM generations WHERE anonId = ? AND userId IS NULL AND mode = 'tailor' ORDER BY createdAt DESC LIMIT 1").get(anonId) : undefined) as { targetRole: string; input: string } | undefined;
  if (!row) return null;
  const input = JSON.parse(row.input) as { jobDescription?: string; resume?: string };
  if (!input.jobDescription || !input.resume) return null;
  return { targetRole: row.targetRole, posting: input.jobDescription, resume: input.resume };
}

export function serialiseFit(row: FitRow, cached: boolean, usage: { left: number; resetsAt: string | null }) {
  const result = JSON.parse(row.result) as FitAnalysis;
  const score = fitScore(result.items);
  return { id: row.id, cached, lang: row.lang, role: result.role, score, verdict: fitVerdict(score), items: result.items, gaps: topGaps(result.items), summary: result.summary, createdAt: row.createdAt, runsLeft: usage.left, resetsAt: usage.resetsAt };
}
export type FitView = ReturnType<typeof serialiseFit>;
