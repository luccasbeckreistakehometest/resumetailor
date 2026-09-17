import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Lang } from "@/lib/ai/kit";

/**
 * "Your résumé is missing numbers": the kit call already asked up to five questions; the person
 * answered some. One cheap patch-style call rewrites ONLY those bullets with ONLY those figures,
 * and the edits are applied by exact replacement — nothing else in the résumé can change.
 */
export interface QuantifyAnswer { bullet: string; question: string; value: string; context: string }
export const PatchSchema = z.object({ edits: z.array(z.object({ before: z.string(), after: z.string() })) });
export type Patch = z.infer<typeof PatchSchema>;

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

/** Applies edits by exact string replacement; unmatched or unsafe edits are skipped. */
export function applyPatch(text: string, edits: Patch["edits"]): { text: string; applied: number } {
  let out = text;
  let applied = 0;
  for (const e of edits) {
    const before = e.before.trim();
    const after = e.after.trim();
    if (!before || !after || before === after || after.length > before.length * 2 + 120) continue;
    const at = out.indexOf(before);
    if (at < 0 || out.includes(after)) continue;          // not found, or already there: never duplicate
    if (after.includes("\n") && !before.includes("\n")) continue;   // one bullet stays one line
    out = out.slice(0, at) + after + out.slice(at + before.length);
    applied++;
  }
  return { text: out, applied };
}

/** The bullets as they appear in the résumé, without their markers (what `before` must match). */
export const bulletText = (line: string) => line.replace(/^\s*[-*•]\s+/, "").trim();

export function mockPatch(answers: QuantifyAnswer[]): Patch {
  return { edits: answers.map((a) => ({ before: a.bullet, after: `${a.bullet.replace(/\.$/, "")} — ${a.value}${a.context ? ` ${a.context}` : ""}` })) };
}

export async function generatePatch(args: { resume: string; answers: QuantifyAnswer[]; lang: Lang }): Promise<{ patch: Patch; model: string; costUsd: number }> {
  if (aiMock()) return { patch: mockPatch(args.answers), model: "mock", costUsd: 0 };
  const items = args.answers.map((a, i) => `${i + 1}. BULLET (copy exactly into "before"): ${a.bullet}\n   QUESTION: ${a.question}\n   CANDIDATE'S ANSWER: ${a.value}${a.context ? ` (${a.context})` : ""}`).join("\n");
  const response = await getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 1500,
    system: `You edit résumé bullets. For each numbered item, return one edit: "before" is the bullet text copied exactly as given, "after" is the same bullet rewritten in ${LANG_NAME[args.lang]} so it states the candidate's answer as a concrete result. Use ONLY the figure the candidate gave (same number, same unit); never add other numbers, tools, employers or claims; keep the bullet's meaning, tense and length close to the original; no Markdown marks, no trailing period changes beyond what reads naturally. Do not return edits for anything else.`,
    messages: [{ role: "user", content: `RÉSUMÉ (for context only):\n${args.resume.slice(0, 6000)}\n\nITEMS:\n${items}` }],
    output_config: { format: zodOutputFormat(PatchSchema) },
  }).finalMessage();
  const parsed = response.parsed_output as Patch | null;
  if (!parsed) throw new Error("incomplete: the edits came back unparsed");
  return { patch: { edits: parsed.edits.slice(0, 5) }, model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
