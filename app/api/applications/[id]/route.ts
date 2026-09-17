import { withOwner, bad } from "@/lib/server/http";
import { funnel } from "@/lib/applications/logic";
import { deleteApplication, getApplication, listApplications, ownsApplication, serialiseApplication, updateApplication } from "@/lib/server/applications";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { applicationSchema } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = applicationSchema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Check the fields.");
    const row = getApplication(id);
    if (!row || !ownsApplication(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    const b = { ...parsed.data };
    if (b.nextStepAt === "") b.nextStepAt = null;
    if (b.generationId !== undefined && b.generationId !== null) {
      const g = getGeneration(b.generationId);
      b.generationId = g && ownsGeneration(g, owner.userId, owner.anonId) ? g.id : null;
    }
    const updated = updateApplication(id, b);
    const rows = listApplications(owner.userId, owner.anonId);
    return { body: { item: serialiseApplication(updated, rows.find((r) => r.id === id)?.kitTitle ?? null), funnel: funnel(rows) } };
  });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getApplication(id);
    if (!row || !ownsApplication(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    deleteApplication(id);
    return { body: { ok: true, funnel: funnel(listApplications(owner.userId, owner.anonId)) } };
  });
}
