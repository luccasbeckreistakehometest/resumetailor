import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { take } from "@/lib/server/ratelimit";
import { generateLinkedIn } from "@/lib/ai/linkedin";
import type { Kit, Lang } from "@/lib/ai/kit";
import { linkedinCoverage, roleVocabulary, type LinkedInProfile } from "@/lib/linkedin/logic";
import { getGeneration, ownsGeneration, type GenerationRow } from "@/lib/server/generations";
import { getVariant, saveVariant, type VariantRow } from "@/lib/server/variants";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const KIND = "linkedin";

function view(row: GenerationRow, v: VariantRow, cached: boolean) {
  const kit = JSON.parse(row.result) as Kit;
  const input = JSON.parse(row.input) as { jobDescription?: string };
  const profile = JSON.parse(v.body) as LinkedInProfile;
  return { profile, coverage: linkedinCoverage(profile, roleVocabulary(input.jobDescription ?? "", kit.keywords)), cached, createdAt: v.createdAt, targetRole: row.targetRole, title: row.title, lang: row.lang };
}
export type LinkedInView = ReturnType<typeof view>;

/** The cached pass, or null. Never generates. */
export async function GET(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.unlocked !== 1) return { body: { linkedin: null, locked: true } };
    const v = getVariant(id, KIND);
    return { body: { linkedin: v ? view(row, v, true) : null, locked: false } };
  });
}

/** The full profile pass: one call per kit, cached with it; free on unlocked kits. */
export async function POST(_: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.unlocked !== 1) return bad("unlock_first", 409);
    const cached = getVariant(id, KIND);
    if (cached) return { body: view(row, cached, true) };
    const gate = aiGate();
    if (gate) return gate;
    const rl = take("KIT_EXTRAS_OWNER_HOUR", owner.key);
    if (!rl.ok) return limited(rl);
    const kit = JSON.parse(row.result) as Kit;
    const input = JSON.parse(row.input) as { jobDescription?: string };
    const posting = input.jobDescription ?? "";
    const lang = (["en", "pt", "es"].includes(row.lang) ? row.lang : "en") as Lang;
    const ran = await runAi("linkedin", { ownerKey: owner.key, ip: owner.ip }, () =>
      generateLinkedIn({ kit, targetRole: row.targetRole, posting, vocabulary: roleVocabulary(posting, kit.keywords), lang }));
    if (!ran.ok) return ran.reply;
    const { profile, model, costUsd } = ran.value;
    const saved = saveVariant({ generationId: id, kind: KIND, variant: { subject: "", body: JSON.stringify(profile) }, model, costUsd });
    recordEvent(owner.key, "linkedin", { generationId: id });
    return { body: view(row, saved, false) };
  });
}
