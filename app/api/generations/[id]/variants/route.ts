import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { aiConfigured, describeAiError } from "@/lib/ai/client";
import { generateVariant, VARIANT_KINDS } from "@/lib/ai/variants";
import type { Kit, Lang } from "@/lib/ai/kit";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { getVariant, listVariants, saveVariant, serialiseVariant } from "@/lib/server/variants";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ kind: z.enum(VARIANT_KINDS as [string, ...string[]]) });

/** The texts already grown from this kit, so the studio can show what is ready without a call. */
export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    return { body: { items: row.unlocked === 1 ? listVariants(id).filter((v) => v.kind.startsWith("cover:") || v.kind.startsWith("email:")).map((v) => serialiseVariant(v, true)) : [] } };
  });
}

/** One variant: from the cache when it exists, else one cheap call. Free on an unlocked kit; refused on a locked one. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Unknown variant.");
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("Not found.", 404);
    if (row.unlocked !== 1) return bad("Unlock the kit first.", 409);
    const kind = parsed.data.kind as (typeof VARIANT_KINDS)[number];
    const cached = getVariant(id, kind);
    if (cached) return { body: serialiseVariant(cached, true) };
    if (!aiConfigured()) return bad("The AI service is not configured yet.", 503);
    const kit = JSON.parse(row.result) as Kit;
    const input = JSON.parse(row.input) as { jobDescription?: string };
    const lang = (["en", "pt", "es"].includes(row.lang) ? row.lang : "en") as Lang;
    try {
      const { variant, model, costUsd } = await generateVariant({ kind, kit, title: row.title, targetRole: row.targetRole, posting: input.jobDescription ?? "", lang });
      const saved = saveVariant({ generationId: id, kind, variant, model, costUsd });
      recordEvent(owner.key, "variant", { generationId: id, kind });
      return { body: serialiseVariant(saved, false) };
    } catch (error) {
      console.error("variant", error);
      return bad(describeAiError(error), 502);
    }
  });
}
