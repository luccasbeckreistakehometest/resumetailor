import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Lang } from "@/lib/ai/kit";
import { emptyFacts, splitList, type ProfileFacts } from "@/lib/profile/facts";

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

/**
 * The facts a briefing carries that a résumé-based kit can use: achievements (and experience
 * sentences with a figure in them) and tools. Derived on the server from the stored extraction.
 */
export function briefingFacts(b: Briefing): ProfileFacts {
  const sentences = (t: string) => t.split(/(?<=[.;!?])\s+|\n+/).map((x) => x.trim().replace(/[.;]$/, "")).filter((x) => x.length > 3);
  return {
    ...emptyFacts(),
    achievements: [...sentences(b.achievements), ...sentences(b.experience).filter((x) => /\d/.test(x))].slice(0, 12),
    tools: splitList(b.skills).slice(0, 20),
  };
}

const TOOLS = ["Power BI", "Excel", "SQL", "Python", "HubSpot", "Salesforce", "Google Analytics", "Tableau", "Figma", "SAP"];

export function mockBriefing(transcript: string, lang: Lang): Briefing {
  // Someone who has a résumé and a posting: tailor mode, with what they said out loud kept as facts.
  if (/curr[ií]culo|resume|résumé|\bcv\b/i.test(transcript) && /\bvaga\b|job posting|\boferta\b|posting/i.test(transcript)) {
    const role = transcript.match(/vaga de ([\p{L} ]+?)(?:[;,.]|$)/iu)?.[1] ?? transcript.match(/posting for (?:an? )?([\p{L} ]+?)(?:[;,.]|$)/iu)?.[1] ?? "Data Analyst";
    const achievements = transcript.split(/[;.]/).map((x) => x.trim()).filter((x) => /\d/.test(x)).join(". ");
    const tools = TOOLS.filter((t) => transcript.toLowerCase().includes(t.toLowerCase())).join(", ");
    return {
      mode: "tailor", targetRole: role.trim(), level: "unknown", education: "", experience: "", skills: tools, achievements,
      hasExistingResume: true, hasSpecificJob: true, missing: [],
      followUp: { en: "Optional: what's the result you're proudest of, with a number?", pt: "Opcional: qual resultado te dá mais orgulho, com número?", es: "Opcional: ¿de qué resultado estás más orgulloso, con un número?" }[lang],
      summaryForUser: `Tailor mode for ${role.trim()} [demo].`,
    };
  }
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
missing = the required things still absent for the chosen mode (targetRole is always required; build needs education or skills; improve/tailor need the resume pasted later, so do not list it). Then write ONE natural follow-up question in ${LANG_NAME[args.lang]} asking only for the first missing item. When nothing is missing and the mode is tailor or improve, followUp may instead ask ONE optional question about what résumés usually lack — the result they are proudest of, with a number, or the main tools they use — unless they already said it; start it with the word for "Optional". Otherwise followUp is "". summaryForUser = one sentence in ${LANG_NAME[args.lang]} reflecting back what you understood.`,
    messages: [{ role: "user", content: `${args.priorSummary ? `WHAT WAS ALREADY UNDERSTOOD:\n${args.priorSummary}\n\n` : ""}NEW TRANSCRIPT:\n${args.transcript.slice(0, 6000)}` }],
    output_config: { format: zodOutputFormat(BriefingSchema) },
  });
  const response = await stream.finalMessage();
  if (!response.parsed_output) throw new Error("Could not understand the briefing. Please try again.");
  return { briefing: response.parsed_output as Briefing, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
