import { getDb, newId, nowIso } from "@/lib/server/db";
import type { Kit } from "@/lib/ai/kit";

export type VersionSource = "ai" | "deepen" | "quantify" | "user" | "restore";
export interface VersionRow { id: string; generationId: string; text: string; source: VersionSource; createdAt: string; updatedAt: string }

export const MAX_VERSIONS = 30;
/** Autosaves within this window update the last "user" version instead of adding one each time. */
const COALESCE_MS = 10 * 60_000;

export function listVersions(generationId: string): VersionRow[] {
  return getDb().prepare("SELECT * FROM resume_versions WHERE generationId = ? ORDER BY rowid ASC").all(generationId) as VersionRow[];
}
export function getVersion(id: string): VersionRow | null {
  return (getDb().prepare("SELECT * FROM resume_versions WHERE id = ?").get(id) as VersionRow) ?? null;
}

/** The AI original goes in lazily, the first time anything changes the résumé. */
export function ensureOriginal(generationId: string, currentText: string): void {
  const db = getDb();
  const has = db.prepare("SELECT 1 FROM resume_versions WHERE generationId = ? LIMIT 1").get(generationId);
  if (!has) {
    const at = nowIso();
    db.prepare("INSERT INTO resume_versions (id,generationId,text,source,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(newId("ver"), generationId, currentText, "ai", at, at);
  }
}

export function recordVersion(generationId: string, text: string, source: VersionSource, now = Date.now()): void {
  const db = getDb();
  const at = new Date(now).toISOString();
  const last = db.prepare("SELECT * FROM resume_versions WHERE generationId = ? ORDER BY rowid DESC LIMIT 1").get(generationId) as VersionRow | undefined;
  if (last && last.text === text) return;
  if (source === "user" && last?.source === "user" && now - Date.parse(last.updatedAt) < COALESCE_MS) {
    db.prepare("UPDATE resume_versions SET text = ?, updatedAt = ? WHERE id = ?").run(text, at, last.id);
    return;
  }
  db.prepare("INSERT INTO resume_versions (id,generationId,text,source,createdAt,updatedAt) VALUES (?,?,?,?,?,?)").run(newId("ver"), generationId, text, source, at, at);
  // Oldest go first, except the AI original.
  const ids = (db.prepare("SELECT id FROM resume_versions WHERE generationId = ? ORDER BY rowid ASC").all(generationId) as { id: string }[]).map((r) => r.id);
  const extra = ids.length - MAX_VERSIONS;
  if (extra > 0) {
    const drop = ids.slice(1, 1 + extra);
    db.prepare(`DELETE FROM resume_versions WHERE id IN (${drop.map(() => "?").join(",")})`).run(...drop);
  }
}

/**
 * Replaces the résumé text of a kit and records the version, atomically. The personalisation
 * meter and the truth check are recomputed from the stored text; letters and e-mails are left
 * alone (the person decides when to refresh them).
 */
export function updateResume(generationId: string, text: string, source: VersionSource, now = Date.now()): void {
  const db = getDb();
  db.transaction(() => {
    const row = db.prepare("SELECT result FROM generations WHERE id = ?").get(generationId) as { result: string } | undefined;
    if (!row) return;
    const kit = JSON.parse(row.result) as Kit;
    ensureOriginal(generationId, kit.resume);
    kit.resume = text;
    db.prepare("UPDATE generations SET result = ? WHERE id = ?").run(JSON.stringify(kit), generationId);
    recordVersion(generationId, text, source, now);
  }).immediate();
}

export const serialiseVersion = (v: VersionRow) => ({ id: v.id, source: v.source, createdAt: v.createdAt, updatedAt: v.updatedAt, chars: v.text.length });
