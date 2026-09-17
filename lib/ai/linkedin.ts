import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Kit, Lang } from "@/lib/ai/kit";
import type { LinkedInProfile } from "@/lib/linkedin/logic";

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

/** Structured outputs need nullable, never optional — period is "" when the résumé gives none. */
export const LinkedInSchema = z.object({
  headlines: z.array(z.string()),
  about: z.string(),
  experience: z.array(z.object({ title: z.string(), company: z.string(), period: z.string(), bullets: z.array(z.string()) })),
  skills: z.array(z.string()),
  notes: z.string(),
});

export interface LinkedInArgs { kit: Kit; targetRole: string; posting: string; vocabulary: string[]; lang: Lang }

export function mockLinkedIn(a: LinkedInArgs): LinkedInProfile {
  const role = a.targetRole || "Marketing Manager";
  const table: Record<Lang, { h: string[]; about: string; b: string[]; notes: string }> = {
    en: {
      h: [`${role} · lifecycle marketing, HubSpot, SQL · pipeline +38% YoY`, `I turn funnels into predictable growth — ${role} with 6 years across three markets`, `${role} | Lifecycle marketing · A/B testing · Attribution · Team leadership`],
      about: `${a.kit.linkedinAbout}\n\nWhat I bring to a ${role} seat: lifecycle marketing that grew qualified pipeline 38% in a year, a four-person team led across paid, CRM and content, and the habit of measuring everything in SQL. [demo]`,
      b: ["Grew qualified pipeline 38% YoY through lifecycle campaigns in HubSpot", "Led a team of 4 across paid, CRM and content", "Ran weekly A/B tests and built the attribution model in SQL"],
      notes: "Headline and About carry the role's words; pin the first five skills so recruiters' filters find them. [demo]",
    },
    pt: {
      h: [`${role} · lifecycle marketing, HubSpot, SQL · pipeline +38% ao ano`, `Transformo funil em crescimento previsível — ${role} com 6 anos em três mercados`, `${role} | Lifecycle marketing · Testes A/B · Atribuição · Liderança de time`],
      about: `${a.kit.linkedinAbout}\n\nO que eu levo pra uma cadeira de ${role}: lifecycle marketing que fez o pipeline qualificado crescer 38% em um ano, um time de quatro pessoas liderado em mídia, CRM e conteúdo, e a mania de medir tudo em SQL. [demo]`,
      b: ["Aumentei o pipeline qualificado em 38% ao ano com campanhas de lifecycle no HubSpot", "Liderei um time de 4 pessoas em mídia, CRM e conteúdo", "Rodei testes A/B semanais e construí o modelo de atribuição em SQL"],
      notes: "Headline e Sobre carregam as palavras da vaga; fixa as cinco primeiras competências pra aparecer nos filtros dos recrutadores. [demo]",
    },
    es: {
      h: [`${role} · lifecycle marketing, HubSpot, SQL · pipeline +38% anual`, `Convierto embudos en crecimiento predecible — ${role} con 6 años en tres mercados`, `${role} | Lifecycle marketing · Pruebas A/B · Atribución · Liderazgo de equipo`],
      about: `${a.kit.linkedinAbout}\n\nLo que aporto a un puesto de ${role}: lifecycle marketing que hizo crecer el pipeline calificado un 38% en un año, un equipo de cuatro liderado en pauta, CRM y contenido, y el hábito de medir todo en SQL. [demo]`,
      b: ["Aumenté el pipeline calificado un 38% anual con campañas de lifecycle en HubSpot", "Lideré un equipo de 4 en pauta, CRM y contenido", "Corrí pruebas A/B semanales y construí el modelo de atribución en SQL"],
      notes: "El titular y el Acerca de llevan las palabras del puesto; fija las cinco primeras aptitudes para que los filtros de los reclutadores te encuentren. [demo]",
    },
  };
  const t = table[a.lang];
  const skills = [...new Set([...a.kit.keywords.filter((k) => k.after).map((k) => k.term), ...a.vocabulary.slice(0, 4)])].slice(0, 10);
  return { headlines: t.h, about: t.about, experience: [{ title: "Growth Lead", company: "Acme", period: "2021 – 2026", bullets: t.b }], skills, notes: t.notes };
}

/** One structured call on the cheap model: the whole profile for the target role, from the résumé only. */
export async function generateLinkedIn(a: LinkedInArgs): Promise<{ profile: LinkedInProfile; model: string; costUsd: number }> {
  if (aiMock()) return { profile: mockLinkedIn(a), model: "mock", costUsd: 0 };
  const response = await getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 3000,
    system: `You rewrite a LinkedIn profile so that recruiters searching for "${a.targetRole || "the role"}" find it and believe it. LinkedIn search and recruiter filters match words in the headline, the About and the Skills, so the role's vocabulary must appear where it is TRUE of the candidate. Write in ${LANG_NAME[a.lang]}.
- headlines: EXACTLY 3 options, each ≤ 210 characters, different shapes: (1) role + three specialities + one number; (2) an outcome-first line in the first person; (3) role | skills separated by " · ". No emojis.
- about: 150-260 words, first person, opens with the strongest result, weaves the role's vocabulary naturally, ends with what the candidate is looking for. Plain text with blank lines between paragraphs.
- experience: every real role in the résumé, newest first, with title, company, period as written, and 3-4 bullets ≤ 200 characters each, action-led, quantified only with the candidate's own numbers.
- skills: up to 10 to pin, ordered by relevance to the target role; ONLY skills the résumé supports.
- notes: 1-2 sentences on where the role's vocabulary now lives and which terms were left out because the candidate cannot claim them.
STRICT: never invent employers, dates, numbers, tools or outcomes.`,
    messages: [{ role: "user", content: `TARGET ROLE: ${a.targetRole}\n\nROLE VOCABULARY (use where true): ${a.vocabulary.join(", ")}\n\nJOB POSTING:\n${(a.posting || "(none — a general profile for the role)").slice(0, 4000)}\n\nRÉSUMÉ:\n${a.kit.resume.slice(0, 7000)}\n\nCURRENT ABOUT DRAFT:\n${a.kit.linkedinAbout}\n\nEMPHASISE: ${a.kit.emphasis.join("; ")}` }],
    output_config: { format: zodOutputFormat(LinkedInSchema) },
  }).finalMessage();
  const p = response.parsed_output as LinkedInProfile | null;
  if (!p) throw new Error("The profile came back incomplete. Please try again.");
  return {
    profile: { headlines: p.headlines.slice(0, 3).map((h) => h.slice(0, 220)), about: p.about, experience: p.experience.slice(0, 8).map((e) => ({ ...e, bullets: e.bullets.slice(0, 5) })), skills: p.skills.slice(0, 10), notes: p.notes },
    model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL),
  };
}
