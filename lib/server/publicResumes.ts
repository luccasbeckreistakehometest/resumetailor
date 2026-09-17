import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getDb, newId, nowIso } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/auth";
import { PIN_RULE, slugify, type Template } from "@/lib/resume/public";

export interface PublicResumeRow {
  id: string; generationId: string; userId: string; slug: string; enabled: number; template: string; pinHash: string | null;
  hideContact: number; indexable: number; views: number; lastViewedAt: string | null; createdAt: string; updatedAt: string;
}

export function getPublicByGeneration(generationId: string): PublicResumeRow | null {
  return (getDb().prepare("SELECT * FROM public_resumes WHERE generationId = ?").get(generationId) as PublicResumeRow) ?? null;
}
export function getPublicBySlug(slug: string): PublicResumeRow | null {
  return (getDb().prepare("SELECT * FROM public_resumes WHERE slug = ?").get(slug) as PublicResumeRow) ?? null;
}
export function listPublic(userId: string): PublicResumeRow[] {
  return getDb().prepare("SELECT * FROM public_resumes WHERE userId = ? ORDER BY updatedAt DESC").all(userId) as PublicResumeRow[];
}

function freshSlug(title: string): string {
  const db = getDb();
  for (;;) {
    const slug = `${slugify(title)}-${randomBytes(3).toString("hex")}`;
    if (!db.prepare("SELECT 1 FROM public_resumes WHERE slug = ?").get(slug)) return slug;
  }
}

export interface PublishPatch { enabled?: boolean; template?: Template; hideContact?: boolean; indexable?: boolean; pin?: string | null }

/**
 * Creates the page on first use (the slug never changes afterwards, so a shared link keeps
 * working) and applies the patch. `pin: ""` or null clears the PIN; a new PIN invalidates every
 * browser that had verified the old one, because the cookie token is derived from the hash.
 */
export function upsertPublic(generationId: string, userId: string, title: string, patch: PublishPatch): PublicResumeRow {
  const db = getDb();
  return db.transaction(() => {
    let row = getPublicByGeneration(generationId);
    const at = nowIso();
    if (!row) {
      db.prepare("INSERT INTO public_resumes (id,generationId,userId,slug,enabled,template,pinHash,hideContact,indexable,views,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(newId("pub"), generationId, userId, freshSlug(title), 0, "modern", null, 0, 0, 0, at, at);
      row = getPublicByGeneration(generationId)!;
    }
    const next = { ...row };
    if (patch.enabled !== undefined) next.enabled = patch.enabled ? 1 : 0;
    if (patch.template !== undefined) next.template = patch.template;
    if (patch.hideContact !== undefined) next.hideContact = patch.hideContact ? 1 : 0;
    if (patch.indexable !== undefined) next.indexable = patch.indexable ? 1 : 0;
    if (patch.pin !== undefined) {
      if (patch.pin) { if (!PIN_RULE.test(patch.pin)) throw new Error("pin"); next.pinHash = hashPassword(patch.pin); }
      else next.pinHash = null;
    }
    db.prepare("UPDATE public_resumes SET enabled=?, template=?, pinHash=?, hideContact=?, indexable=?, updatedAt=? WHERE id=?")
      .run(next.enabled, next.template, next.pinHash, next.hideContact, next.indexable, at, row.id);
    return getPublicByGeneration(generationId)!;
  })();
}

export function deletePublic(generationId: string): void {
  getDb().prepare("DELETE FROM public_resumes WHERE generationId = ?").run(generationId);
}

/** Counted for visitors only; the owner checking their own page is not a view. */
export function bumpViews(id: string): void {
  getDb().prepare("UPDATE public_resumes SET views = views + 1, lastViewedAt = ? WHERE id = ?").run(nowIso(), id);
}

export const verifyPin = (row: PublicResumeRow, pin: string): boolean => !!row.pinHash && verifyPassword(pin, row.pinHash);

/* ---------- the "PIN verified" cookie: an HMAC over slug + current PIN hash, nothing a browser can forge ---------- */
export const pinCookieName = (slug: string) => `rt_cv_${slug.replace(/[^a-z0-9-]/gi, "")}`;
const secret = () => { const v = process.env.AUTH_SECRET; if (!v || v.length < 16) throw new Error("AUTH_SECRET is missing or too short"); return v; };
export function pinToken(row: PublicResumeRow): string {
  return createHmac("sha256", secret()).update(`cv|${row.slug}|${row.pinHash ?? ""}`).digest("base64url");
}
export function pinTokenValid(row: PublicResumeRow, token: string | undefined): boolean {
  if (!token || !row.pinHash) return false;
  const expected = pinToken(row);
  return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function serialisePublic(row: PublicResumeRow) {
  return {
    slug: row.slug, enabled: row.enabled === 1, template: row.template as Template, hideContact: row.hideContact === 1, indexable: row.indexable === 1,
    hasPin: !!row.pinHash, views: row.views, lastViewedAt: row.lastViewedAt, createdAt: row.createdAt,
  };
}
export type PublicResumeView = ReturnType<typeof serialisePublic>;
