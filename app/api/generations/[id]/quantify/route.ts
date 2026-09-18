import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { aiGate, runAi } from "@/lib/ai/guard";
import { takeAll } from "@/lib/server/ratelimit";
import { ownedKit } from "@/lib/server/kitAccess";
import { applyPatch, generatePatch, type QuantifyAnswer } from "@/lib/ai/quantify";
import { getDb } from "@/lib/server/db";
import { QUANTIFY_MAX, getGeneration, kitInput, releaseQuantify, reserveQuantify, serialise } from "@/lib/server/generations";
import { updateResume } from "@/lib/server/versions";
import { clearTextVariants } from "@/lib/server/variants";
import { saveProfile } from "@/lib/server/profiles";
import { emptyFacts } from "@/lib/profile/facts";
import { recordEvent } from "@/lib/server/onboarding";
import type { Kit, Lang } from "@/lib/ai/kit";

export const runtime = "nodejs";
const schema = z.object({
  answers: z.array(z.object({ index: z.number().int().min(0).max(4), value: z.string().max(60), context: z.string().max(120).default("") })).min(1).max(5),
});

/**
 * The person's answers to the "missing numbers" questions → one patch call that rewrites only
 * those bullets with only those figures. Free on an unlocked kit, capped per kit: the round is
 * claimed before the call and given back only if the call fails (a call that ran counts, even if
 * nothing matched). Bullets the person already rewrote in the editor are not sent (409 when none
 * is left). Answers become truth-check sources and profile facts; the previous résumé stays in
 * the version history.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    const kit = ownedKit(id, owner, { unlocked: true });
    if ("reply" in kit) return kit.reply;
    if (!parsed.success) return bad("answer_first");
    const k = JSON.parse(kit.row.result) as Kit;
    const asks = k.quantifyAsks ?? [];
    const given: QuantifyAnswer[] = parsed.data.answers
      .filter((a) => a.value.trim() && asks[a.index])
      .map((a) => ({ bullet: asks[a.index].bullet, question: asks[a.index].question, value: a.value.trim(), context: a.context.trim() }));
    if (!given.length) return bad("answer_first");
    // Only bullets still in the résumé as asked: an edited one cannot be patched by exact replace.
    const answers = given.filter((a) => k.resume.includes(a.bullet));
    if (!answers.length) return bad("bullet_changed", 409);
    if ((kit.row.quantified ?? 0) >= QUANTIFY_MAX) return { body: { error: "limit" }, status: 429 };
    const gate = aiGate(owner);
    if (gate) return gate;
    const over = takeAll([["KIT_EXTRAS_OWNER_HOUR", owner.key], ["KIT_EXTRAS_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    if (!reserveQuantify(id)) return { body: { error: "limit" }, status: 429 };
    const lang = (["en", "pt", "es"].includes(kit.row.lang) ? kit.row.lang : "en") as Lang;
    const ran = await runAi("quantify", owner, () => generatePatch({ resume: k.resume, answers, lang }));
    if (!ran.ok) { releaseQuantify(id); return ran.reply; }
    const { patch, costUsd } = ran.value;
    const { text, applied } = applyPatch(k.resume, patch.edits);
    const db = getDb();
    const input = kitInput(kit.row);
    const lines = new Set((input.answers ?? "").split("\n").filter(Boolean));
    for (const a of answers) lines.add(`${a.question} → ${a.value}${a.context ? ` ${a.context}` : ""}`);
    db.prepare("UPDATE generations SET input = ?, costUsd = costUsd + ? WHERE id = ?").run(JSON.stringify({ ...input, answers: [...lines].join("\n") }), costUsd, id);
    if (applied > 0) { updateResume(id, text, "quantify"); clearTextVariants(id); }
    saveProfile(owner.key, { facts: { ...emptyFacts(), numbers: answers.map((a) => ({ bullet: a.bullet, value: a.value, context: a.context })) } });
    recordEvent(owner.key, "quantify", { generationId: id, answered: answers.length, applied });
    return { body: { ...serialise(getGeneration(id)!), applied } };
  });
}
