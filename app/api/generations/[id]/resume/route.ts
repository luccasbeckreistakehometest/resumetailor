import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { getGeneration, serialise } from "@/lib/server/generations";
import { updateResume } from "@/lib/server/versions";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const RESUME_MAX = 20_000;
const schema = z.object({ resume: z.string().min(1).max(RESUME_MAX) });

/** The editor's autosave: replaces the résumé of an unlocked kit and records the version. No AI, no credit. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    if (!parsed.success) return bad("check_fields");
    const rl = take("KIT_EDIT_OWNER_HOUR", owner.key);
    if (!rl.ok) return limited(rl);
    updateResume(id, parsed.data.resume, "user");
    return { body: serialise(getGeneration(id)!) };
  });
}
