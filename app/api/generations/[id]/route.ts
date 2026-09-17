import { withOwner, bad } from "@/lib/server/http";
import { deleteGeneration, getGeneration, ownsGeneration, renameGeneration, serialise } from "@/lib/server/generations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    return { body: serialise(row) };
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { title } = await request.json().catch(() => ({}));
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (typeof title === "string" && title.trim()) renameGeneration(id, title.trim());
    return { body: serialise(getGeneration(id)!) };
  });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    deleteGeneration(id);
    return { body: { ok: true } };
  });
}
