import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Kit, Lang } from "@/lib/ai/kit";

/**
 * Text variants an unlocked kit can grow: the cover letter in another register, and the three
 * recruiter emails that change outcomes. Each is one cheap call, grounded in the kit and the
 * posting, written in the kit's language, and cached per kit + kind by the caller.
 */
export const COVER_TONES = ["formal", "warm", "direct", "confident"] as const;
export const EMAIL_KINDS = ["applied", "thanks", "nudge"] as const;
export type CoverTone = (typeof COVER_TONES)[number];
export type EmailKind = (typeof EMAIL_KINDS)[number];
export type VariantKind = `cover:${CoverTone}` | `email:${EmailKind}`;
export const VARIANT_KINDS: VariantKind[] = [...COVER_TONES.map((t) => `cover:${t}` as const), ...EMAIL_KINDS.map((k) => `email:${k}` as const)];
export const isVariantKind = (k: unknown): k is VariantKind => typeof k === "string" && (VARIANT_KINDS as string[]).includes(k);

/** Structured outputs need nullable, never optional: a letter carries subject "". */
export const VariantSchema = z.object({ subject: z.string(), body: z.string() });
export interface Variant { subject: string; body: string }

export interface VariantArgs { kind: VariantKind; kit: Kit; title: string; targetRole: string; posting: string; lang: Lang }

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

const TONE_BRIEF: Record<CoverTone, string> = {
  formal: "Formal register: full sentences, no contractions, respectful distance, classic salutation and sign-off. Suits banks, public sector, law, large corporations.",
  warm: "Warm register: friendly and personal without being casual; shows genuine interest in the company and the people; first person, natural rhythm. Suits startups, NGOs, education, healthcare.",
  direct: "Direct register: short sentences, the strongest evidence first, no throat-clearing, one clear ask at the end. Suits sales, operations, engineering, anyone reading 200 letters.",
  confident: "Confident register: states outcomes plainly, owns results, forward-looking ('here is what I would do in the first 90 days'), never arrogant and never inventing.",
};
const EMAIL_BRIEF: Record<EmailKind, string> = {
  applied: "Sent right after applying, to the recruiter or hiring manager: 80-120 words. Names the role, one line on why this company, the single strongest matching result from the résumé, and an easy next step. Subject: role name + candidate name.",
  thanks: "Sent within a day of an interview: 80-120 words. Thanks them by role of the conversation, refers to ONE concrete topic from the interview as a bracketed placeholder the candidate fills in ([the topic we discussed]), reinforces one strength with a fact from the résumé, restates interest. Subject mentions the interview.",
  nudge: "Sent after 7-10 days of silence: 60-100 words. Polite, zero guilt, restates interest in one sentence, adds one small new piece of value or evidence, asks about timeline. Subject makes it easy to find the original thread.",
};

function prompt(a: VariantArgs): { system: string; user: string } {
  const [type, sub] = a.kind.split(":") as ["cover" | "email", CoverTone | EmailKind];
  const shared = `Write in ${LANG_NAME[a.lang]}. Use ONLY facts present in the RÉSUMÉ and the ORIGINAL LETTER: never invent employers, numbers, tools, dates or outcomes. Where a detail only the candidate knows belongs (recruiter's name, interview date, the topic discussed), write a bracketed placeholder such as [Recruiter name]. Plain text, no Markdown.`;
  if (type === "cover") {
    return {
      system: `You rewrite a cover letter in a different register for the role "${a.targetRole || "the role"}". ${TONE_BRIEF[sub as CoverTone]} Keep every real fact, reorder freely, 180-250 words, salutation to sign-off with the candidate's name. subject is "". ${shared}`,
      user: `ORIGINAL LETTER:\n${a.kit.coverLetter.slice(0, 3000)}\n\nJOB POSTING:\n${(a.posting || "(no specific posting — a general application for the role)").slice(0, 4000)}\n\nRÉSUMÉ:\n${a.kit.resume.slice(0, 3500)}\n\nEMPHASISE: ${a.kit.emphasis.join("; ")}`,
    };
  }
  return {
    system: `You write ONE recruiter email for a candidate applying to "${a.targetRole || "the role"}". ${EMAIL_BRIEF[sub as EmailKind]} Sign with the candidate's name (${a.title}). subject is the email subject line. ${shared}`,
    user: `JOB POSTING:\n${(a.posting || "(no specific posting)").slice(0, 3000)}\n\nRÉSUMÉ:\n${a.kit.resume.slice(0, 3000)}\n\nEMPHASISE: ${a.kit.emphasis.join("; ")}\n\nCOVER LETTER (for voice and facts):\n${a.kit.coverLetter.slice(0, 1500)}`,
  };
}

const MOCK: Record<Lang, Record<VariantKind, (a: VariantArgs) => Variant>> = {
  en: {
    "cover:formal": (a) => ({ subject: "", body: `Dear Hiring Committee,\n\nI am writing to apply for the position of ${a.targetRole}. Over six years I have built lifecycle programmes that grew qualified pipeline by 38% and led a team of four. [demo · formal]\n\nI would welcome the opportunity to discuss how this experience serves your objectives.\n\nYours sincerely,\n${a.title}` }),
    "cover:warm": (a) => ({ subject: "", body: `Hi there,\n\nI've followed your work for a while, and the ${a.targetRole} role feels like the right place to bring what I love doing: turning funnels into predictable growth — 38% more pipeline in a year, with a team of four I'm still proud of. [demo · warm]\n\nI'd love to talk.\n\nWarmly,\n${a.title}` }),
    "cover:direct": (a) => ({ subject: "", body: `I'm applying for ${a.targetRole}. Three facts: pipeline up 38% YoY; a four-person team led across paid, CRM and content; hands-on SQL and attribution. [demo · direct]\n\nHappy to walk through any of them. Are you free this week?\n\n${a.title}` }),
    "cover:confident": (a) => ({ subject: "", body: `Dear Hiring Manager,\n\nI grow pipeline. At Acme that meant 38% more qualified pipeline in a year, built with a team of four. As your ${a.targetRole}, my first 90 days would go to the measurement plan and the segmentation. [demo · confident]\n\nBest regards,\n${a.title}` }),
    "email:applied": (a) => ({ subject: `${a.targetRole} — application from ${a.title}`, body: `Hi [Recruiter name],\n\nI just applied for the ${a.targetRole} role. One line on why: at Acme I grew qualified pipeline 38% in a year with a team of four, and that's the work I'd love to do for you. [demo]\n\nHappy to share more whenever useful.\n\nBest,\n${a.title}` }),
    "email:thanks": (a) => ({ subject: `Thank you — ${a.targetRole} interview`, body: `Hi [Interviewer name],\n\nThank you for today. I keep thinking about [the topic we discussed] — it's close to the 38% pipeline story I shared. [demo]\n\nI'm very interested in the role and glad to answer anything else.\n\nBest,\n${a.title}` }),
    "email:nudge": (a) => ({ subject: `Following up — ${a.targetRole} application`, body: `Hi [Recruiter name],\n\nA quick follow-up on my ${a.targetRole} application from [date]. Still very interested; since then I [one small new result]. [demo]\n\nIs there an update on the timeline?\n\nThanks,\n${a.title}` }),
  },
  pt: {
    "cover:formal": (a) => ({ subject: "", body: `Prezada equipe de recrutamento,\n\nVenho me candidatar à vaga de ${a.targetRole}. Ao longo de seis anos construí programas de lifecycle que aumentaram o pipeline qualificado em 38% e liderei um time de quatro pessoas. [demo · formal]\n\nColoco-me à disposição para uma conversa.\n\nAtenciosamente,\n${a.title}` }),
    "cover:warm": (a) => ({ subject: "", body: `Olá,\n\nAcompanho o trabalho de vocês faz um tempo, e a vaga de ${a.targetRole} parece o lugar certo pra fazer o que eu mais gosto: transformar funil em crescimento previsível — 38% a mais de pipeline em um ano, com um time de quatro que ainda me deixa orgulhoso. [demo · calorosa]\n\nAdoraria conversar.\n\nUm abraço,\n${a.title}` }),
    "cover:direct": (a) => ({ subject: "", body: `Estou me candidatando pra ${a.targetRole}. Três fatos: pipeline 38% maior em um ano; time de quatro pessoas liderado em mídia, CRM e conteúdo; SQL e atribuição na mão. [demo · direta]\n\nPosso detalhar qualquer um deles. Tem um horário essa semana?\n\n${a.title}` }),
    "cover:confident": (a) => ({ subject: "", body: `Prezado gestor,\n\nEu faço pipeline crescer. Na Acme isso significou 38% a mais de pipeline qualificado em um ano, com um time de quatro pessoas. Como ${a.targetRole}, meus primeiros 90 dias iriam pro plano de medição e pra segmentação. [demo · confiante]\n\nAtenciosamente,\n${a.title}` }),
    "email:applied": (a) => ({ subject: `${a.targetRole} — candidatura de ${a.title}`, body: `Oi, [nome do recrutador],\n\nAcabei de me candidatar à vaga de ${a.targetRole}. Em uma linha: na Acme eu aumentei o pipeline qualificado em 38% em um ano com um time de quatro, e é esse trabalho que eu quero fazer com vocês. [demo]\n\nQualquer coisa, é só chamar.\n\nAbraço,\n${a.title}` }),
    "email:thanks": (a) => ({ subject: `Obrigado pela conversa — entrevista de ${a.targetRole}`, body: `Oi, [nome de quem entrevistou],\n\nObrigado pela conversa de hoje. Fiquei pensando em [o assunto que discutimos] — tem tudo a ver com a história dos 38% de pipeline que contei. [demo]\n\nSigo muito interessado na vaga e à disposição pra qualquer dúvida.\n\nAbraço,\n${a.title}` }),
    "email:nudge": (a) => ({ subject: `Acompanhando — candidatura pra ${a.targetRole}`, body: `Oi, [nome do recrutador],\n\nPassando pra acompanhar minha candidatura pra ${a.targetRole}, enviada em [data]. Continuo bem interessado; de lá pra cá, [um resultado novo e pequeno]. [demo]\n\nTem alguma previsão de próximos passos?\n\nObrigado,\n${a.title}` }),
  },
  es: {
    "cover:formal": (a) => ({ subject: "", body: `Estimado comité de selección:\n\nMe dirijo a ustedes para postular al puesto de ${a.targetRole}. Durante seis años construí programas de lifecycle que aumentaron el pipeline calificado un 38% y lideré un equipo de cuatro personas. [demo · formal]\n\nQuedo a su disposición para conversar.\n\nAtentamente,\n${a.title}` }),
    "cover:warm": (a) => ({ subject: "", body: `Hola:\n\nSigo el trabajo de ustedes desde hace un tiempo, y el puesto de ${a.targetRole} parece el lugar indicado para hacer lo que más disfruto: convertir embudos en crecimiento predecible — 38% más de pipeline en un año, con un equipo de cuatro del que sigo orgulloso. [demo · cálida]\n\nMe encantaría conversar.\n\nUn saludo cordial,\n${a.title}` }),
    "cover:direct": (a) => ({ subject: "", body: `Postulo a ${a.targetRole}. Tres hechos: pipeline 38% mayor en un año; equipo de cuatro personas liderado en pauta, CRM y contenido; SQL y atribución de primera mano. [demo · directa]\n\nPuedo detallar cualquiera. ¿Tienes un espacio esta semana?\n\n${a.title}` }),
    "cover:confident": (a) => ({ subject: "", body: `Estimado gerente:\n\nHago crecer el pipeline. En Acme eso significó 38% más de pipeline calificado en un año, con un equipo de cuatro. Como ${a.targetRole}, mis primeros 90 días irían al plan de medición y a la segmentación. [demo · segura]\n\nSaludos,\n${a.title}` }),
    "email:applied": (a) => ({ subject: `${a.targetRole} — postulación de ${a.title}`, body: `Hola, [nombre del reclutador]:\n\nAcabo de postular al puesto de ${a.targetRole}. En una línea: en Acme aumenté el pipeline calificado un 38% en un año con un equipo de cuatro, y ese es el trabajo que quiero hacer con ustedes. [demo]\n\nQuedo atento a lo que necesiten.\n\nSaludos,\n${a.title}` }),
    "email:thanks": (a) => ({ subject: `Gracias — entrevista para ${a.targetRole}`, body: `Hola, [nombre de quien entrevistó]:\n\nGracias por la conversación de hoy. Me quedé pensando en [el tema que discutimos] — se conecta con la historia del 38% de pipeline que conté. [demo]\n\nSigo muy interesado en el puesto y disponible para cualquier duda.\n\nSaludos,\n${a.title}` }),
    "email:nudge": (a) => ({ subject: `Seguimiento — postulación a ${a.targetRole}`, body: `Hola, [nombre del reclutador]:\n\nEscribo para dar seguimiento a mi postulación a ${a.targetRole}, enviada el [fecha]. Sigo muy interesado; desde entonces, [un resultado nuevo y pequeño]. [demo]\n\n¿Hay novedades sobre los plazos?\n\nGracias,\n${a.title}` }),
  },
};

export const mockVariant = (a: VariantArgs): Variant => MOCK[a.lang][a.kind](a);

export async function generateVariant(a: VariantArgs): Promise<{ variant: Variant; model: string; costUsd: number }> {
  if (aiMock()) return { variant: mockVariant(a), model: "mock", costUsd: 0 };
  const { system, user } = prompt(a);
  const response = await getClient().messages.stream({ model: EXTRACT_MODEL, max_tokens: 1200, system, messages: [{ role: "user", content: user }], output_config: { format: zodOutputFormat(VariantSchema) } }).finalMessage();
  const p = response.parsed_output as Variant | null;
  if (!p) throw new Error("The text came back incomplete. Please try again.");
  return { variant: { subject: p.subject.slice(0, 200), body: p.body.slice(0, 4000) }, model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
