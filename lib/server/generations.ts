import { getDb, newId, nowIso } from "@/lib/server/db";
import { moveCredits } from "@/lib/server/users";
import type { Kit } from "@/lib/ai/kit";
import { personalisation } from "@/lib/ats/personalisation";
import { getPublicByGeneration, serialisePublic } from "@/lib/server/publicResumes";
import { clearVariants } from "@/lib/server/variants";

export interface GenerationRow {
  id: string; userId: string | null; anonId: string | null; mode: string; source: string; lang: string; title: string;
  targetRole: string; input: string; result: string; matchBefore: number; matchAfter: number; unlocked: number;
  unlockedAt: string | null; model: string; costUsd: number; deepened: number; createdAt: string;
}

/** "Go deeper" passes per kit. Each is a full generation, so the count is bounded; override per deployment. */
export const DEEPEN_MAX = Number(process.env.KIT_DEEPEN_MAX ?? 2);

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

/** Replaces the kit in place after a deepening pass. Unlock state and ownership are untouched; no credit moves. */
export function deepenGeneration(id: string, kit: Kit, model: string, costUsd: number): GenerationRow {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE generations SET result = ?, matchBefore = ?, matchAfter = ?, title = ?, model = ?, costUsd = costUsd + ?, deepened = deepened + 1 WHERE id = ?")
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
export function serialise(row: GenerationRow, forAdmin = false) {
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
    publicResume: open ? (() => { const p = getPublicByGeneration(row.id); return p ? serialisePublic(p) : null; })() : null,
    kit: open ? kit : null,
  };
}
export type GenerationView = ReturnType<typeof serialise>;
