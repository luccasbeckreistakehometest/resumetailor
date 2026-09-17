import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { deletePublic, getPublicByGeneration, serialisePublic, upsertPublic } from "@/lib/server/publicResumes";
import { TEMPLATES } from "@/lib/resume/public";
import { recordEvent } from "@/lib/server/onboarding";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  enabled: z.boolean().optional(), template: z.enum(TEMPLATES).optional(), hideContact: z.boolean().optional(), indexable: z.boolean().optional(),
  pin: z.string().max(12).nullable().optional(),
});

/** The owner's view of a kit's web résumé; null until first published. */
export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    const p = getPublicByGeneration(id);
    return { body: { publicResume: p ? serialisePublic(p) : null } };
  });
}

/** Publishes or updates. Only an unlocked kit on an account: the page shows the full résumé, and a link must stay reachable. */
export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("check_fields");
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (!owner.userId) return bad("account_required", 401);
    if (row.unlocked !== 1) return bad("unlock_first", 409);
    const current = getPublicByGeneration(id);
    if ((current?.takenDownAt || row.publishBlockedAt) && parsed.data.enabled) return bad("taken_down", 409);
    try {
      const p = await upsertPublic(id, owner.userId, row.title, parsed.data);
      if (parsed.data.enabled !== undefined) recordEvent(owner.userId, parsed.data.enabled ? "cv_publish" : "cv_unpublish", { generationId: id });
      return { body: { publicResume: serialisePublic(p) } };
    } catch (e) {
      if (e instanceof Error && e.message === "pin") return bad("pin_invalid");
      throw e;
    }
  });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    deletePublic(id);
    return { body: { ok: true } };
  });
}
