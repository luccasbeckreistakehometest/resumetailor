import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { ownedKit } from "@/lib/server/kitAccess";
import { getGeneration, serialise } from "@/lib/server/generations";
import { getVersion, listVersions, serialiseVersion, updateResume } from "@/lib/server/versions";
import type { Kit } from "@/lib/ai/kit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Version history of an unlocked kit's résumé (newest first). */
export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    const items = listVersions(id).reverse().map(serialiseVersion);
    const current = (JSON.parse(kit.row.result) as Kit).resume;
    return { body: { items, currentChars: current.length } };
  });
}

const schema = z.object({ versionId: z.string().max(64) });

/** Brings an earlier version back (itself recorded as a "restore", so it can be undone too). */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    if (!parsed.success) return bad("check_fields");
    const v = getVersion(parsed.data.versionId);
    if (!v || v.generationId !== id) return bad("not_found", 404);
    updateResume(id, v.text, "restore");
    return { body: serialise(getGeneration(id)!) };
  });
}
