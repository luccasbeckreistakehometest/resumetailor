import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Lang } from "@/lib/ai/kit";
import { mockFit, type FitAnalysis } from "@/lib/fit/logic";

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

/** Structured outputs need nullable, never optional — evidence is "" when there is none. */
export const FitSchema = z.object({
  role: z.string(),
  items: z.array(z.object({
    requirement: z.string(),
    weight: z.enum(["critical", "important", "nice"]),
    status: z.enum(["found", "partial", "missing"]),
    evidence: z.string(),
    advice: z.string(),
  })),
  summary: z.string(),
});

/**
 * The free "am I a fit?" pre-check: the posting's must-haves, each judged against the résumé
 * with the line that proves it. Cheap model, one call, and the caller caches by input hash.
 */
export async function analyseFit(a: { posting: string; resume: string; lang: Lang }): Promise<{ result: FitAnalysis; model: string; costUsd: number }> {
  if (aiMock()) return { result: mockFit(a.posting, a.resume, a.lang), model: "mock", costUsd: 0 };
  const stream = getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 2500,
    system: `You are a senior recruiter screening ONE résumé against ONE job posting. Be honest and specific; never flatter.
1. role: the job title exactly as the posting states it (or "" if absent).
2. items: the posting's 6-12 real requirements — skills, tools, years, credentials, domain, languages — as short phrases in the posting's own words. weight: "critical" when the posting marks it required/must-have or repeats it, "important" for core responsibilities, "nice" for preferred/plus/bonus items.
   For each, judge from the RÉSUMÉ ONLY: "found" = explicit evidence; "partial" = adjacent or weaker evidence (related tool, fewer years, similar domain); "missing" = nothing supports it.
   evidence: the résumé line or phrase that supports it, quoted verbatim (max 160 characters), or "" when missing.
   advice: ONE sentence in ${LANG_NAME[a.lang]}. found → how to make it more visible (where to place it, what number to attach). partial → how to phrase the adjacent experience truthfully. missing → the honest move: a course, a project, or simply leaving it out. Never suggest claiming something the candidate does not have.
3. summary: two plain sentences in ${LANG_NAME[a.lang]} a friend would say — what carries this application and what does not.`,
    messages: [{ role: "user", content: `JOB POSTING:\n${a.posting.slice(0, 7000)}\n\nRÉSUMÉ:\n${a.resume.slice(0, 9000)}` }],
    output_config: { format: zodOutputFormat(FitSchema) },
  });
  const response = await stream.finalMessage();
  const p = response.parsed_output as z.infer<typeof FitSchema> | null;
  if (!p) throw new Error("Could not read the posting and the résumé together. Please try again.");
  return {
    result: { role: p.role.slice(0, 120), items: p.items.slice(0, 12).map((i) => ({ ...i, requirement: i.requirement.slice(0, 120), evidence: i.evidence.slice(0, 200) })), summary: p.summary },
    model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL),
  };
}
