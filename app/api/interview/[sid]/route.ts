import { withOwner, bad } from "@/lib/server/http";
import { getGeneration } from "@/lib/server/generations";
import { getSession, ownsSession, serialiseSession } from "@/lib/server/interviews";

export async function GET(_: Request, ctx: { params: Promise<{ sid: string }> }) {
  const { sid } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getSession(sid);
    if (!row || !ownsSession(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    const gen = getGeneration(row.generationId);
    return { body: serialiseSession(row, gen ? { title: gen.title, targetRole: gen.targetRole } : undefined) };
  });
}
