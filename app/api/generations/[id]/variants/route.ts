import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { lease, takeAll } from "@/lib/server/ratelimit";
import { generateVariant, VARIANT_KINDS } from "@/lib/ai/variants";
import type { Kit, Lang } from "@/lib/ai/kit";
import { getGeneration, ownsGeneration } from "@/lib/server/generations";
import { clearTextVariants, getVariant, listVariants, saveVariant, serialiseVariant } from "@/lib/server/variants";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ kind: z.enum(VARIANT_KINDS as [string, ...string[]]) });

/** The texts already grown from this kit, so the studio can show what is ready without a call. */
export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    return { body: { items: row.unlocked === 1 ? listVariants(id).filter((v) => v.kind.startsWith("cover:") || v.kind.startsWith("email:")).map((v) => serialiseVariant(v, true)) : [] } };
  });
}

/** One variant: from the cache when it exists, else one cheap call. Free on an unlocked kit; refused on a locked one. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("unknown_variant");
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.unlocked !== 1) return bad("unlock_first", 409);
    const kind = parsed.data.kind as (typeof VARIANT_KINDS)[number];
    const cached = getVariant(id, kind);
    if (cached) return { body: serialiseVariant(cached, true) };
    const gate = aiGate({ ownerKey: owner.key, ip: owner.ip });
    if (gate) return gate;
    const over = takeAll([["KIT_EXTRAS_OWNER_HOUR", owner.key], ["KIT_EXTRAS_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    // One generation at a time for this text: a parallel duplicate is refused instead of paying twice.
    const slot = lease("KIT_EXTRA_INFLIGHT", `${id}|${kind}`);
    if (!slot.ok) return limited(slot.failed, "ai_busy");
    try {
      const kit = JSON.parse(row.result) as Kit;
      const input = JSON.parse(row.input) as { jobDescription?: string };
      const lang = (["en", "pt", "es"].includes(row.lang) ? row.lang : "en") as Lang;
      const ran = await runAi("variant", { ownerKey: owner.key, ip: owner.ip }, () =>
        generateVariant({ kind, kit, title: row.title, targetRole: row.targetRole, posting: input.jobDescription ?? "", lang }));
      if (!ran.ok) return ran.reply;
      const { variant, model, costUsd } = ran.value;
      const saved = saveVariant({ generationId: id, kind, variant, model, costUsd });
      recordEvent(owner.key, "variant", { generationId: id, kind });
      return { body: serialiseVariant(saved, false) };
    } finally {
      slot.release();
    }
  });
}

/**
 * "Refresh letters and e-mails with the new version": after an edit, the cached letters and
 * e-mails (and the LinkedIn pass) were written from the old text. Only on request, never automatic.
 */
export async function DELETE(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.unlocked !== 1) return bad("unlock_first", 403);
    const removed = clearTextVariants(id);
    recordEvent(owner.key, "variants_refresh", { generationId: id, removed });
    return { body: { ok: true, removed } };
  });
}
