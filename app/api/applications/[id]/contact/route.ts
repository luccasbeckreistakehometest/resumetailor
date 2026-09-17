import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { funnel } from "@/lib/applications/logic";
import { getApplication, listApplications, markContacted, ownsApplication, serialiseApplication } from "@/lib/server/applications";

const schema = z.object({ kind: z.enum(["followup", "thanks", "feedback", "moveon", "prep", "offer"]) });

/** "Marquei como enviado": the person sent the message themselves; the radar moves on. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("check_fields");
    const row = getApplication(id);
    if (!row || !ownsApplication(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    const updated = markContacted(id, parsed.data.kind);
    return { body: { item: serialiseApplication(updated), funnel: funnel(listApplications(owner.userId, owner.anonId)) } };
  });
}
