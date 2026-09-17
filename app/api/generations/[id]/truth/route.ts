import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { ownedKit } from "@/lib/server/kitAccess";
import { getGeneration, kitChecks, serialise, setTruthAck } from "@/lib/server/generations";
import type { Kit } from "@/lib/ai/kit";

export const runtime = "nodejs";
const schema = z.object({ key: z.string().min(3).max(300), ack: z.boolean().default(true) });

/** "Tá certo, é meu": the person confirms a flagged item (or takes the confirmation back). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    if (!parsed.success) return bad("check_fields");
    const report = kitChecks(kit.row, JSON.parse(kit.row.result) as Kit, true);
    if (!report.truth.items?.some((i) => i.key === parsed.data.key)) return bad("not_found", 404);
    setTruthAck(kit.row, parsed.data.key, parsed.data.ack);
    return { body: serialise(getGeneration(id)!) };
  });
}
