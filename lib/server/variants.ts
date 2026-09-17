import { getDb, newId, nowIso } from "@/lib/server/db";
import type { Variant, VariantKind } from "@/lib/ai/variants";

export interface VariantRow { id: string; generationId: string; kind: VariantKind; subject: string; body: string; model: string; costUsd: number; createdAt: string }

/** Cached texts grown from a kit — cover letter tones, recruiter emails, the LinkedIn pass. One row per kit + kind. */
export function getVariant(generationId: string, kind: string): VariantRow | null {
  return (getDb().prepare("SELECT * FROM kit_variants WHERE generationId = ? AND kind = ?").get(generationId, kind) as VariantRow) ?? null;
}
export function listVariants(generationId: string): VariantRow[] {
  return getDb().prepare("SELECT * FROM kit_variants WHERE generationId = ? ORDER BY createdAt ASC").all(generationId) as VariantRow[];
}
export function saveVariant(input: { generationId: string; kind: string; variant: Variant; model: string; costUsd: number }): VariantRow {
  getDb().prepare(`INSERT INTO kit_variants (id,generationId,kind,subject,body,model,costUsd,createdAt) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(generationId, kind) DO UPDATE SET subject=excluded.subject, body=excluded.body, model=excluded.model, costUsd=excluded.costUsd, createdAt=excluded.createdAt`)
    .run(newId("var"), input.generationId, input.kind, input.variant.subject, input.variant.body, input.model, input.costUsd, nowIso());
  return getVariant(input.generationId, input.kind)!;
}
/** A deepened kit is a different kit: everything derived from the old text goes. */
export function clearVariants(generationId: string): void {
  getDb().prepare("DELETE FROM kit_variants WHERE generationId = ?").run(generationId);
}
export const serialiseVariant = (r: VariantRow, cached: boolean) => ({ kind: r.kind, subject: r.subject, body: r.body, cached, createdAt: r.createdAt });
export type VariantView = ReturnType<typeof serialiseVariant>;
const TEXT_KINDS = "(kind LIKE 'cover:%' OR kind LIKE 'email:%' OR kind = 'linkedin')";
/** The letters, e-mails and LinkedIn pass only (what an edit of the résumé makes stale). */
export function clearTextVariants(generationId: string): number {
  return getDb().prepare(`DELETE FROM kit_variants WHERE generationId = ? AND ${TEXT_KINDS}`).run(generationId).changes;
}

/**
 * "Refresh letters": only the texts written before the résumé last changed are stale, so only
 * those go. With no change since, nothing is removed (and no new AI call can be triggered).
 */
const lastResumeChange = (generationId: string) =>
  (getDb().prepare("SELECT MAX(updatedAt) at FROM resume_versions WHERE generationId = ? AND source != 'ai'").get(generationId) as { at: string | null }).at;
export function staleTextVariants(generationId: string): number {
  const at = lastResumeChange(generationId);
  if (!at) return 0;
  return (getDb().prepare(`SELECT COUNT(*) n FROM kit_variants WHERE generationId = ? AND ${TEXT_KINDS} AND createdAt < ?`).get(generationId, at) as { n: number }).n;
}
export function clearStaleTextVariants(generationId: string): number {
  const at = lastResumeChange(generationId);
  if (!at) return 0;
  return getDb().prepare(`DELETE FROM kit_variants WHERE generationId = ? AND ${TEXT_KINDS} AND createdAt < ?`).run(generationId, at).changes;
}
