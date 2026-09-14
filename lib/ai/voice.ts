import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Lang } from "@/lib/ai/kit";

/**
 * What a spoken briefing turns into. The listener asks one follow-up at a time until nothing
 * required is missing, so `missing` and `followUp` drive the conversation, not the UI.
 */
export const BriefingSchema = z.object({
  mode: z.enum(["tailor", "improve", "build", "unknown"]),
  targetRole: z.string(),
  level: z.enum(["student", "entry", "mid", "senior", "unknown"]),
  education: z.string(),
  experience: z.string(),
  skills: z.string(),
  achievements: z.string(),
  hasExistingResume: z.boolean(),
  hasSpecificJob: z.boolean(),
  missing: z.array(z.string()),
  followUp: z.string(),
  summaryForUser: z.string(),
});
export type Briefing = z.infer<typeof BriefingSchema>;

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

export function mockBriefing(transcript: string, lang: Lang): Briefing {
  const enough = transcript.length > 80;
  return {
    mode: enough ? "build" : "unknown", targetRole: enough ? "Marketing Analyst" : "", level: enough ? "entry" : "unknown",
    education: enough ? "BA Marketing, 2025" : "", experience: enough ? "Internship at a local agency, 8 months" : "",
    skills: enough ? "Excel, Google Analytics, English" : "", achievements: "", hasExistingResume: false, hasSpecificJob: false,
    missing: enough ? [] : ["targetRole", "education"],
    followUp: enough ? "" : { en: "What role are you aiming for, and what did you study?", pt: "Qual vaga você quer, e o que você estudou?", es: "¿Qué puesto buscas y qué estudiaste?" }[lang],
    summaryForUser: enough ? "Entry-level marketing analyst, BA in Marketing, agency internship." : "",
  };
}

export async function extractBriefing(args: { transcript: string; lang: Lang; priorSummary?: string }): Promise<{ briefing: Briefing; costUsd: number }> {
  if (aiMock()) return { briefing: mockBriefing(args.transcript, args.lang), costUsd: 0 };
  const stream = getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 1500,
    system: `You turn a spoken, informal career briefing into structured fields for a resume builder. The person is talking, not typing: fix disfluencies, keep facts exactly as said, never add facts.
Decide mode: "tailor" if they have a resume AND a specific job posting; "improve" if they have a resume but no specific job; "build" if they have no resume yet; "unknown" if you cannot tell.
Fill education / experience / skills / achievements as short paragraphs in their own words. Leave a field "" when they said nothing about it.
missing = the required things still absent for the chosen mode (targetRole is always required; build needs education or skills; improve/tailor need the resume pasted later, so do not list it). Then write ONE natural follow-up question in ${LANG_NAME[args.lang]} asking only for the first missing item — or "" when nothing is missing. summaryForUser = one sentence in ${LANG_NAME[args.lang]} reflecting back what you understood.`,
    messages: [{ role: "user", content: `${args.priorSummary ? `WHAT WAS ALREADY UNDERSTOOD:\n${args.priorSummary}\n\n` : ""}NEW TRANSCRIPT:\n${args.transcript.slice(0, 6000)}` }],
    output_config: { format: zodOutputFormat(BriefingSchema) },
  });
  const response = await stream.finalMessage();
  if (!response.parsed_output) throw new Error("Could not understand the briefing. Please try again.");
  return { briefing: response.parsed_output as Briefing, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
