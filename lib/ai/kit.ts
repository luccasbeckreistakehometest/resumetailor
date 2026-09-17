import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { KIT_MODEL, MOCK_AI_DOWN, MockAiDown, aiMock, costOf, getClient } from "@/lib/ai/client";
import { promptBanList } from "@/lib/ats/cliche";

export type Mode = "tailor" | "improve" | "build";
export type Lang = "en" | "pt" | "es";

/** Structured outputs need nullable, never optional. */
export const KitSchema = z.object({
  resume: z.string(),
  coverLetter: z.string(),
  linkedinAbout: z.string(),
  matchBefore: z.number(),
  matchAfter: z.number(),
  keywords: z.array(z.object({ term: z.string(), before: z.boolean(), after: z.boolean() })),
  emphasis: z.array(z.string()),
  interviewPrep: z.object({
    talkingPoints: z.array(z.string()),
    technical: z.array(z.string()),
    behavioral: z.array(z.string()),
    questionsToAsk: z.array(z.string()),
  }),
  matchNotes: z.string(),
  /** Bullets that would be stronger with a figure only the candidate knows: one short question each. */
  quantifyAsks: z.array(z.object({ bullet: z.string(), question: z.string(), unitHint: z.string() })),
});
export type QuantifyAsk = { bullet: string; question: string; unitHint: string };
/** Kits stored before round 3 have no quantifyAsks. */
export type Kit = Omit<z.infer<typeof KitSchema>, "quantifyAsks"> & { mode: Mode; quantifyAsks?: QuantifyAsk[] };

export interface KitInput {
  mode: Mode; targetRole: string; jobDescription?: string; resume?: string; profile?: string; lang: Lang;
  /** A second pass over a tailored kit: the posting's must-haves the first draft missed. */
  deepen?: { mustHaves: string[] };
}

const deepenBlock = (i: KitInput) => i.deepen?.mustHaves.length ? `
DEEPEN PASS — the previous draft read generic for this posting. These must-haves from the posting were missing or buried: ${i.deepen.mustHaves.slice(0, 12).join(", ")}.
Rewrite so that each one the candidate's real background genuinely supports appears explicitly — in the summary, in Skills, and in at least one quantified bullet using the posting's exact wording. Where the background does NOT support a term, leave it out and say so in matchNotes; never fake it. Prefer fewer, sharper, evidence-backed bullets over volume.` : "";

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

const RULES = `STRICT RULES:
- Never invent jobs, employers, degrees, certifications, dates, or metrics the candidate did not provide.
- Only set a keyword "after": true if it is genuinely supported by the candidate's real background. Do not fake skills.
- interviewPrep.talkingPoints must be grounded in the candidate's REAL background.
- matchAfter should be high but realistic (typically 82-95) and never 100. matchBefore and matchAfter are integers 0-100.
- Quantify achievements only using numbers the candidate actually gave.
- quantifyAsks: 0-5 items. For résumé bullets that would be clearly stronger with a number the candidate did NOT give (volume, %, money, time saved, team size), ask ONE short, concrete question in the kit language, e.g. "How many customers did you serve per day?". "bullet" is that bullet's text exactly as it appears in your résumé, without the leading "- ". unitHint is a short unit ("customers/day", "%", "R$"). Never ask about bullets that already have a figure.
- keywords: 8-12 items. emphasis: 3-5. Each interviewPrep list: 3-5 (questionsToAsk: 2-3). technical may be empty for non-technical roles.
- The resume is clean Markdown ready to paste. The cover letter is plain text, ~250 words max. linkedinAbout is first person, 90-150 words.`;

/** Chatbot phrases recruiters say they skip, and the metrics the candidate already gave. */
const styleRules = (lang: Lang) => `
- Preserve every metric already in the candidate's résumé (numbers, %, money, team sizes, dates); never drop or change them.
- Write like a person, not a chatbot. Never use these phrases (or their translations): ${promptBanList(lang).map((p) => `"${p}"`).join(", ")}. Vary how bullets start; avoid em-dashes as decoration.`;

function prompt(i: KitInput): { system: string; user: string } {
  const langLine = `Write every field in ${LANG_NAME[i.lang]}, in the register a strong local recruiter expects.${styleRules(i.lang)}`;
  const role = (i.targetRole || "").slice(0, 200);
  if (i.mode === "improve") {
    return {
      system: `You are an expert resume writer, ATS specialist, and interview coach. The candidate has a resume but NO specific job posting. Improve it to be ATS-friendly and recruiter-ready for their target role: rewrite weak bullets into quantified, action-led achievements, add the skills/keywords most expected for this kind of role (only those the candidate plausibly has), and fix structure. Also write a general cover letter, a LinkedIn About, what to emphasize, and interview prep for this kind of role.
For scoring: matchBefore = how ATS-ready/keyword-rich the ORIGINAL resume is. matchAfter = after your rewrite. keywords = the most important skills for the target role, marking before/after presence.
${langLine}
${RULES}`,
      user: `TARGET ROLE (may be blank): ${role}\n\nCURRENT RESUME:\n${(i.resume || "").slice(0, 8000)}`,
    };
  }
  if (i.mode === "build") {
    return {
      system: `You are an expert resume writer and interview coach helping someone create their FIRST resume (student / recent grad / career starter, little or no formal experience). Build a strong, honest, modern resume from the profile — lead with education, projects, internships, volunteer work, coursework, transferable skills. Also write a cover letter, a LinkedIn About, what to emphasize, and entry-level interview prep.
For scoring: matchBefore = 0 (no prior resume). matchAfter = how strong/complete the new resume is for the target role. keywords = key skills for the target role (before:false, after:true only where genuinely supported).
${langLine}
${RULES}`,
      user: `TARGET ROLE (may be blank): ${role}\n\nCANDIDATE PROFILE:\n${(i.profile || "").slice(0, 6000)}`,
    };
  }
  return {
    system: `You are an expert career coach, resume writer, ATS specialist, and interview coach. Given a JOB DESCRIPTION and the candidate's CURRENT RESUME, tailor the resume tightly to the job (mirror key keywords, lead with relevant quantified impact, ATS-friendly). Also write a compelling cover letter for this role, a LinkedIn About, what the candidate should EMPHASIZE for this specific job, and concrete INTERVIEW PREP for this exact role (technical topics if applicable, likely behavioral questions, talking points grounded in their real background, and smart questions to ask).
For scoring: matchBefore = % of the job's important keywords/requirements genuinely present in the ORIGINAL resume. matchAfter = after tailoring. keywords = the 8-12 most important keywords/requirements from the JD, each marked present-before / present-after.
${langLine}
${RULES}${deepenBlock(i)}`,
    user: `JOB DESCRIPTION:\n${(i.jobDescription || "").slice(0, 6000)}\n\nCURRENT RESUME:\n${(i.resume || "").slice(0, 8000)}`,
  };
}

const clamp = (n: number, dft: number) => (Number.isFinite(n) ? Math.max(0, Math.min(99, Math.round(n))) : dft);

function normalise(p: z.infer<typeof KitSchema>, mode: Mode): Kit {
  const before = clamp(p.matchBefore, mode === "build" ? 0 : 35);
  let after = clamp(p.matchAfter, 90);
  if (after <= before) after = Math.min(95, before + 25);
  return {
    ...p, mode, matchBefore: before, matchAfter: after,
    quantifyAsks: (p.quantifyAsks ?? []).filter((q) => q.bullet.trim() && q.question.trim()).slice(0, 5),
    keywords: p.keywords.slice(0, 12), emphasis: p.emphasis.slice(0, 6),
    interviewPrep: {
      talkingPoints: p.interviewPrep.talkingPoints.slice(0, 6), technical: p.interviewPrep.technical.slice(0, 6),
      behavioral: p.interviewPrep.behavioral.slice(0, 6), questionsToAsk: p.interviewPrep.questionsToAsk.slice(0, 4),
    },
  };
}

const MOCK_ASK: Record<Lang, [string, string, string, string]> = {
  en: ["How many customers did that team serve per day?", "customers/day", "How many campaigns did you run per quarter?", "campaigns/quarter"],
  pt: ["Quantos clientes esse time atendia por dia?", "clientes/dia", "Quantas campanhas você rodava por trimestre?", "campanhas/trimestre"],
  es: ["¿Cuántos clientes atendía ese equipo por día?", "clientes/día", "¿Cuántas campañas lanzabas por trimestre?", "campañas/trimestre"],
};

/** A believable kit for e2e runs and keyless demos; clearly labelled so nobody ships it as real. */
export function mockKit(i: KitInput): Kit {
  const role = i.targetRole || "Marketing Manager";
  // The deepened fixture addresses every must-have with a figure, so the personalisation meter visibly rises.
  const deeper = i.deepen?.mustHaves.length
    ? `\n\n## Tailored for this posting [demo]\n${i.deepen.mustHaves.slice(0, 12).map((m, n) => `- ${m}: hands-on for ${2 + (n % 4)} years, with results up ${12 + n * 3}%`).join("\n")}`
    : "";
  return normalise({
    resume: `# Alex Ribeiro\n${role} · alex@example.com · São Paulo\n\n## Summary\n${role} with 6 years driving measurable growth. [demo output]\n\n## Experience\n**Growth Lead — Acme** (2021–2026)\n- Grew qualified pipeline 38% YoY through lifecycle campaigns\n- Led a team of 4 across paid, CRM and content\n\n## Skills\nHubSpot · SQL · A/B testing · Copywriting${deeper}`,
    coverLetter: `Dear Hiring Team,\n\nI'm applying for the ${role} role. [demo output] Over six years I've built lifecycle programmes that grew pipeline by 38% and led a four-person team.\n\nBest regards,\nAlex Ribeiro`,
    linkedinAbout: `I'm a ${role} who turns funnels into predictable growth. [demo output] Six years, three markets, one habit: measure everything.`,
    matchBefore: i.mode === "build" ? 0 : 41, matchAfter: 89,
    keywords: [
      { term: "lifecycle marketing", before: false, after: true }, { term: "HubSpot", before: true, after: true },
      { term: "A/B testing", before: false, after: true }, { term: "pipeline", before: true, after: true },
      { term: "SQL", before: true, after: true }, { term: "team leadership", before: false, after: true },
      { term: "CRM", before: true, after: true }, { term: "attribution", before: false, after: true },
    ],
    emphasis: ["Pipeline growth of 38% YoY", "Leading a cross-functional team", "Hands-on SQL and attribution"],
    interviewPrep: {
      talkingPoints: ["The 38% pipeline story: what changed and how you measured it", "How you scoped the team of four"],
      technical: ["Attribution models", "Lifecycle segmentation in HubSpot"],
      behavioral: ["A campaign that failed and what you changed", "Managing a disagreement with sales"],
      questionsToAsk: ["How is marketing pipeline attributed today?", "What does success look like at 90 days?"],
    },
    matchNotes: i.deepen ? "Demo mode: deepened fixture, not an AI result." : "Demo mode: this kit is a fixture, not an AI result.",
    quantifyAsks: [
      { bullet: "Led a team of 4 across paid, CRM and content", question: MOCK_ASK[i.lang][0], unitHint: MOCK_ASK[i.lang][1] },
      { bullet: "Grew qualified pipeline 38% YoY through lifecycle campaigns", question: MOCK_ASK[i.lang][2], unitHint: MOCK_ASK[i.lang][3] },
    ],
  }, i.mode);
}

export async function generateKit(i: KitInput): Promise<{ kit: Kit; model: string; costUsd: number }> {
  if (aiMock()) {
    if (i.targetRole.includes(MOCK_AI_DOWN)) throw new MockAiDown();
    return { kit: mockKit(i), model: "mock", costUsd: 0 };
  }
  const { system, user } = prompt(i);
  // Streaming avoids HTTP timeouts on a long kit; the parsed output arrives with the final message.
  const stream = getClient().messages.stream({
    model: KIT_MODEL,
    max_tokens: 6000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(KitSchema) },
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new Error("incomplete: the kit came back truncated or unparsed");
  return { kit: normalise(response.parsed_output as z.infer<typeof KitSchema>, i.mode), model: KIT_MODEL, costUsd: costOf(response.usage, KIT_MODEL) };
}
