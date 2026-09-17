import { envNumber } from "@/lib/server/env";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { moveCredits } from "@/lib/server/users";
import type { Kit } from "@/lib/ai/kit";
import { personalisation } from "@/lib/ats/personalisation";
import { getPublicByGeneration, serialisePublic } from "@/lib/server/publicResumes";
import { clearVariants } from "@/lib/server/variants";
import { ensureOriginal, listVersions, recordVersion } from "@/lib/server/versions";
import { truthCheck, userAddedLines } from "@/lib/ats/truth";
import { clicheCheck, type ClicheLang } from "@/lib/ats/cliche";

export interface GenerationRow {
  id: string; userId: string | null; anonId: string | null; mode: string; source: string; lang: string; title: string;
  targetRole: string; input: string; result: string; matchBefore: number; matchAfter: number; unlocked: number;
  unlockedAt: string | null; model: string; costUsd: number; deepened: number; createdAt: string;
  publishBlockedAt: string | null; truthAck: string; quantified: number;
}

/** "Missing numbers" rounds per kit (one patch call each). */
export const QUANTIFY_MAX = envNumber("KIT_QUANTIFY_MAX", 1);
export const reserveQuantify = (id: string) =>
  getDb().prepare("UPDATE generations SET quantified = quantified + 1 WHERE id = ? AND quantified < ?").run(id, QUANTIFY_MAX).changes === 1;
export const releaseQuantify = (id: string) => { getDb().prepare("UPDATE generations SET quantified = quantified - 1 WHERE id = ? AND quantified > 0").run(id); };

/** What the kit's input stored about the candidate (never the posting). */
export interface KitInputRecord { jobDescription?: string; resume?: string; profile?: string; briefingId?: string; spoken?: string; answers?: string }
export const kitInput = (row: GenerationRow) => { try { return JSON.parse(row.input) as KitInputRecord; } catch { return {} as KitInputRecord; } };

/** Everything the candidate gave us for this kit: the truth check's sources. */
export function kitSources(row: GenerationRow): string[] {
  const i = kitInput(row);
  return [i.resume ?? "", i.profile ?? "", i.spoken ?? "", i.answers ?? "", userAddedLines(listVersions(row.id))];
}

const ackedKeys = (row: GenerationRow): Set<string> => { try { return new Set(JSON.parse(row.truthAck || "[]") as string[]); } catch { return new Set(); } };

/**
 * The truth check and the "sounds human" check. A locked kit gets counts only — no flagged text.
 */
export function kitChecks(row: GenerationRow, kit: Kit, open: boolean) {
  const added = kit.keywords.filter((k) => k.after && !k.before).map((k) => k.term);
  const truth = truthCheck({ kitText: `${kit.resume}\n\n## ✉\n${kit.coverLetter}`, sources: kitSources(row), addedSkills: added });
  const acked = ackedKeys(row);
  const pending = truth.unverified.filter((u) => !acked.has(u.key));
  const lang = (["en", "pt", "es"].includes(row.lang) ? row.lang : "en") as ClicheLang;
  const human = clicheCheck(`${kit.resume}\n${kit.coverLetter}`, lang);
  return {
    truth: {
      checked: truth.checked, pending: pending.length, confirmed: truth.unverified.length - pending.length,
      items: open ? truth.unverified.map((u) => ({ ...u, acked: acked.has(u.key) })) : null,
    },
    human: { score: human.score, flagged: human.hits.length + human.patterns.length, hits: open ? human.hits : null, patterns: open ? human.patterns : null },
  };
}

/** "That's right, it's mine" (or undo). Keys come from the current report only. */
export function setTruthAck(row: GenerationRow, key: string, ack: boolean): void {
  const keys = ackedKeys(row);
  if (ack) keys.add(key); else keys.delete(key);
  getDb().prepare("UPDATE generations SET truthAck = ? WHERE id = ?").run(JSON.stringify([...keys].slice(-200)), row.id);
}

/** "Go deeper" passes per kit. Each is a full generation, so the count is bounded; override per deployment. */
export const DEEPEN_MAX = envNumber("KIT_DEEPEN_MAX", 2);

/** The candidate's name is usually the first line of the resume; that makes a better title than "Resume". */
export function titleFrom(kit: Kit): string {
  const first = kit.resume.split("\n").map((l) => l.replace(/^#+\s*/, "").trim()).find(Boolean);
  return (first || "Resume").slice(0, 60);
}

export function saveGeneration(input: {
  userId: string | null; anonId: string | null; mode: string; source: "text" | "voice"; lang: string; targetRole: string;
  input: unknown; kit: Kit; model: string; costUsd: number;
}): GenerationRow {
  const id = newId("gen");
  getDb().prepare(`INSERT INTO generations (id,userId,anonId,mode,source,lang,title,targetRole,input,result,matchBefore,matchAfter,model,costUsd,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, input.userId, input.userId ? null : input.anonId, input.mode, input.source, input.lang, titleFrom(input.kit), input.targetRole,
    JSON.stringify(input.input), JSON.stringify(input.kit), input.kit.matchBefore, input.kit.matchAfter, input.model, input.costUsd, nowIso(),
  );
  return getGeneration(id)!;
}

export function getGeneration(id: string): GenerationRow | null {
  return (getDb().prepare("SELECT * FROM generations WHERE id = ?").get(id) as GenerationRow) ?? null;
}

export function ownsGeneration(row: GenerationRow, userId: string | null, anonId: string | undefined): boolean {
  if (userId && row.userId === userId) return true;
  return !!anonId && row.anonId === anonId && !row.userId;
}

export function listGenerations(userId: string | null, anonId: string | undefined): GenerationRow[] {
  const db = getDb();
  if (userId) return db.prepare("SELECT * FROM generations WHERE userId = ? ORDER BY createdAt DESC LIMIT 100").all(userId) as GenerationRow[];
  if (anonId) return db.prepare("SELECT * FROM generations WHERE anonId = ? AND userId IS NULL ORDER BY createdAt DESC LIMIT 20").all(anonId) as GenerationRow[];
  return [];
}

/** Spends one credit and opens the kit. Atomic with the ledger so a double click cannot charge twice. */
export function unlockGeneration(id: string, userId: string): { ok: true; credits: number } | { ok: false; reason: "already" | "insufficient" | "missing" } {
  const db = getDb();
  return db.transaction(() => {
    const row = getGeneration(id);
    if (!row || row.userId !== userId) return { ok: false as const, reason: "missing" as const };
    if (row.unlocked) return { ok: false as const, reason: "already" as const };
    let credits: number;
    try { credits = moveCredits(userId, -1, "unlock", id); } catch { return { ok: false as const, reason: "insufficient" as const }; }
    db.prepare("UPDATE generations SET unlocked = 1, unlockedAt = ? WHERE id = ?").run(nowIso(), id);
    return { ok: true as const, credits };
  })();
}

/**
 * Claims one "go deeper" pass BEFORE the generation runs: a single conditional UPDATE, so parallel
 * requests on one kit cannot all pass the cap. False when the kit has used them all.
 */
export function reserveDeepen(id: string): boolean {
  return getDb().prepare("UPDATE generations SET deepened = deepened + 1 WHERE id = ? AND deepened < ?").run(id, DEEPEN_MAX).changes === 1;
}

/** Gives a reserved pass back (the generation failed). */
export function releaseDeepen(id: string): void {
  getDb().prepare("UPDATE generations SET deepened = deepened - 1 WHERE id = ? AND deepened > 0").run(id);
}

/**
 * Replaces the kit in place after a deepening pass (the pass itself was counted by reserveDeepen).
 * Unlock state and ownership are untouched; no credit moves.
 */
export function deepenGeneration(id: string, kit: Kit, model: string, costUsd: number): GenerationRow {
  const db = getDb();
  db.transaction(() => {
    const before = getGeneration(id);
    if (before) ensureOriginal(id, (JSON.parse(before.result) as Kit).resume);
    recordVersion(id, kit.resume, "deepen");
    db.prepare("UPDATE generations SET result = ?, matchBefore = ?, matchAfter = ?, title = ?, model = ?, costUsd = costUsd + ? WHERE id = ?")
      .run(JSON.stringify(kit), kit.matchBefore, kit.matchAfter, titleFrom(kit), model, costUsd, id);
    clearVariants(id);   // letters, emails and the LinkedIn pass were written from the old text
  })();
  return getGeneration(id)!;
}

export function renameGeneration(id: string, title: string): void {
  getDb().prepare("UPDATE generations SET title = ? WHERE id = ?").run(title.slice(0, 80), id);
}
export function deleteGeneration(id: string): void {
  getDb().prepare("DELETE FROM generations WHERE id = ?").run(id);
}

/** What the browser is allowed to see: the full kit only once unlocked; a preview otherwise. */
export function serialise(row: GenerationRow, forAdmin = false, opts: { light?: boolean } = {}) {
  const kit = JSON.parse(row.result) as Kit;
  const open = row.unlocked === 1 || forAdmin;
  // The meter is computed here, from the stored résumé and posting, so a locked kit can show it without exposing the text.
  const input = row.mode === "tailor" ? (JSON.parse(row.input) as { jobDescription?: string }) : null;
  return {
    id: row.id, mode: row.mode, source: row.source, lang: row.lang, title: row.title, targetRole: row.targetRole,
    matchBefore: row.matchBefore, matchAfter: row.matchAfter, unlocked: row.unlocked === 1, createdAt: row.createdAt,
    keywords: kit.keywords, matchNotes: kit.matchNotes, emphasis: kit.emphasis,
    coverLetterPreview: kit.coverLetter.split("\n").slice(0, 4).join("\n"),
    personalisation: input ? personalisation(kit.resume, input.jobDescription ?? "") : null,
    deepened: row.deepened ?? 0, deepenLeft: Math.max(0, DEEPEN_MAX - (row.deepened ?? 0)),
    checks: opts.light ? null : kitChecks(row, kit, open),
    quantify: { count: (kit.quantifyAsks ?? []).length, asks: open ? kit.quantifyAsks ?? [] : null, used: row.quantified ?? 0, left: Math.max(0, QUANTIFY_MAX - (row.quantified ?? 0)) },
    original: open && row.mode !== "build" ? kitInput(row).resume ?? null : null,
    publicResume: open ? (() => { const p = getPublicByGeneration(row.id); return p ? serialisePublic(p) : null; })() : null,
    kit: open ? kit : null,
  };
}
export type GenerationView = ReturnType<typeof serialise>;
