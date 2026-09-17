import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { take } from "@/lib/server/ratelimit";
import { generateKit, type Kit, type Lang } from "@/lib/ai/kit";
import { DEEPEN_MAX, deepenGeneration, getGeneration, ownsGeneration, serialise } from "@/lib/server/generations";
import { personalisation } from "@/lib/ats/personalisation";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";

/**
 * "Go deeper": re-runs tailoring with the posting's must-haves — the terms the current draft
 * misses — emphasised, and replaces the kit in place. It never costs a credit; an unlocked kit
 * stays unlocked. Bounded per kit because every run is a full generation.
 */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(async (owner) => {
    const row = getGeneration(id);
    if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return bad("not_found", 404);
    if (row.mode !== "tailor") return bad("kit_not_tailored", 409);
    if (row.deepened >= DEEPEN_MAX) return { body: { error: "limit" }, status: 429 };
    const gate = aiGate();
    if (gate) return gate;
    const input = JSON.parse(row.input) as { jobDescription?: string; resume?: string };
    const kit = JSON.parse(row.result) as Kit;
    const meter = personalisation(kit.resume, input.jobDescription ?? "");
    if (!meter) return bad("no_posting", 409);
    const mustHaves = [...meter.missing, ...kit.keywords.filter((k) => !k.after).map((k) => k.term)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
    const rl = take("KIT_EXTRAS_OWNER_HOUR", owner.key);
    if (!rl.ok) return limited(rl);
    const ran = await runAi("deepen", { ownerKey: owner.key, ip: owner.ip }, () => generateKit({
      mode: "tailor", targetRole: row.targetRole, lang: (["en", "pt", "es"].includes(row.lang) ? row.lang : "en") as Lang,
      jobDescription: input.jobDescription, resume: input.resume, deepen: { mustHaves },
    }));
    if (!ran.ok) return ran.reply;
    const { kit: next, model, costUsd } = ran.value;
    const updated = deepenGeneration(id, next, model, costUsd);
    recordEvent(owner.key, "deepen", { generationId: id, before: meter.score, after: personalisation(next.resume, input.jobDescription ?? "")?.score ?? null });
    return { body: serialise(updated) };
  });
}
