import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Lang } from "@/lib/ai/kit";
import { clampScore, type Question, type Scores, type Turn } from "@/lib/interview/logic";

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };

/** Structured outputs need nullable, never optional — there is nothing optional here on purpose. */
export const AnswerScoreSchema = z.object({
  structure: z.number(),
  specificity: z.number(),
  relevance: z.number(),
  coaching: z.array(z.string()),
  modelAnswer: z.string(),
});
export const SessionSummarySchema = z.object({ rehearse: z.array(z.string()), overall: z.string() });

export interface AnswerScore { scores: Scores; coaching: string[]; modelAnswer: string }
export interface SessionSummary { rehearse: string[]; overall: string }

export interface ScoreArgs { question: Question; answer: string; targetRole: string; background: string; lang: Lang }

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** Deterministic: a fuller, number-bearing answer scores higher, so e2e runs can see the meter move. */
export function mockAnswerScore(a: ScoreArgs): AnswerScore {
  const words = wordCount(a.answer);
  const numbers = (a.answer.match(/\d+/g) ?? []).length;
  const structure = clampScore(3 + Math.min(5, words / 20));
  const specificity = clampScore(3 + Math.min(6, numbers * 2));
  const relevance = clampScore(words >= 25 ? 7 : 4);
  const c: Record<Lang, string[]> = {
    en: ["Open with the situation in one sentence, then get to what you did. [demo]", "Add one number: size, time saved, or growth. [demo]", "Close with the result and what you'd repeat. [demo]"],
    pt: ["Abre com a situação em uma frase e vai direto pro que você fez. [demo]", "Coloca um número: tamanho, tempo ganho ou crescimento. [demo]", "Fecha com o resultado e o que você repetiria. [demo]"],
    es: ["Abre con la situación en una frase y ve directo a lo que hiciste. [demo]", "Agrega un número: tamaño, tiempo ahorrado o crecimiento. [demo]", "Cierra con el resultado y lo que repetirías. [demo]"],
  };
  const m: Record<Lang, string> = {
    en: `At Acme I owned the lifecycle programme. The pipeline had stalled, so I rebuilt the segmentation and ran weekly A/B tests. Qualified pipeline grew 38% in a year, and I'd start with the measurement plan next time. [demo]`,
    pt: `Na Acme eu era responsável pelo programa de lifecycle. O pipeline tinha travado, então refiz a segmentação e rodei testes A/B semanais. O pipeline qualificado cresceu 38% em um ano — e da próxima vez eu começaria pelo plano de medição. [demo]`,
    es: `En Acme era responsable del programa de lifecycle. El pipeline se había estancado, así que rehíce la segmentación y corrí pruebas A/B semanales. El pipeline calificado creció 38% en un año, y la próxima vez empezaría por el plan de medición. [demo]`,
  };
  return { scores: { structure, specificity, relevance }, coaching: c[a.lang], modelAnswer: m[a.lang] };
}

export async function scoreAnswer(a: ScoreArgs): Promise<{ result: AnswerScore; costUsd: number }> {
  if (aiMock()) return { result: mockAnswerScore(a), costUsd: 0 };
  const stream = getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 1200,
    system: `You are a senior interviewer and interview coach for the role "${a.targetRole || "the role"}". You score ONE answer to ONE interview question. The answer is a spoken transcript: ignore disfluencies and judge the substance.
Scores are integers 0-10:
- structure: does the answer follow a clear Situation → Task → Action → Result shape, in that order, without rambling.
- specificity: concrete evidence — numbers, named tools, named outcomes — instead of generalities.
- relevance: how directly it answers THIS question for THIS role.
coaching: 2-3 short lines in ${LANG_NAME[a.lang]}, each one sentence, direct, kind, actionable, about this answer specifically.
modelAnswer: a stronger version of THEIR answer in ${LANG_NAME[a.lang]}, first person, 90-140 words, using ONLY facts present in the answer or in CANDIDATE BACKGROUND. Never invent employers, numbers, tools or outcomes; where a number would help but none was given, write a bracketed placeholder such as [number].`,
    messages: [{ role: "user", content: `QUESTION:\n${a.question.text}\n\nCANDIDATE ANSWER (transcript):\n${a.answer.slice(0, 4000)}\n\nCANDIDATE BACKGROUND:\n${a.background.slice(0, 3500)}` }],
    output_config: { format: zodOutputFormat(AnswerScoreSchema) },
  });
  const response = await stream.finalMessage();
  const p = response.parsed_output as z.infer<typeof AnswerScoreSchema> | null;
  if (!p) throw new Error("Could not score the answer. Please try again.");
  return {
    result: { scores: { structure: clampScore(p.structure), specificity: clampScore(p.specificity), relevance: clampScore(p.relevance) }, coaching: p.coaching.slice(0, 3), modelAnswer: p.modelAnswer },
    costUsd: costOf(response.usage, EXTRACT_MODEL),
  };
}

export interface SummaryArgs { questions: Question[]; turns: Turn[]; targetRole: string; lang: Lang }

export function mockSummary(a: SummaryArgs): SessionSummary {
  const r: Record<Lang, string[]> = {
    en: ["Rehearse your opener until it lands in under 60 seconds. [demo]", "Pick two stories and attach a number to each. [demo]", "Practise ending every answer with the result. [demo]"],
    pt: ["Ensaia sua apresentação até ela caber em 60 segundos. [demo]", "Escolhe duas histórias e coloca um número em cada uma. [demo]", "Treina terminar toda resposta com o resultado. [demo]"],
    es: ["Ensaya tu presentación hasta que quepa en 60 segundos. [demo]", "Elige dos historias y ponle un número a cada una. [demo]", "Practica cerrar cada respuesta con el resultado. [demo]"],
  };
  const o: Record<Lang, string> = {
    en: `Solid base across ${a.turns.length} answer${a.turns.length === 1 ? "" : "s"}; tighten the structure and add evidence. [demo]`,
    pt: `Base boa em ${a.turns.length} resposta${a.turns.length === 1 ? "" : "s"}; aperta a estrutura e traz mais evidência. [demo]`,
    es: `Base sólida en ${a.turns.length} respuesta${a.turns.length === 1 ? "" : "s"}; ajusta la estructura y suma evidencia. [demo]`,
  };
  return { rehearse: r[a.lang], overall: o[a.lang] };
}

export async function summariseSession(a: SummaryArgs): Promise<{ result: SessionSummary; costUsd: number }> {
  if (aiMock()) return { result: mockSummary(a), costUsd: 0 };
  const transcript = a.turns.map((t) => `Q${t.questionIdx + 1}: ${a.questions[t.questionIdx]?.text ?? ""}\nScores: structure ${t.scores.structure}, specificity ${t.scores.specificity}, relevance ${t.scores.relevance}\nCoaching: ${t.coaching.join(" | ")}\nAnswer: ${t.answer.slice(0, 900)}`).join("\n\n");
  const stream = getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 700,
    system: `You close a mock interview for the role "${a.targetRole || "the role"}". From the scored answers, write in ${LANG_NAME[a.lang]}:
- rehearse: EXACTLY 3 concrete things to practise before the real interview, each one sentence, ordered by impact, specific to what this candidate actually said.
- overall: 1-2 sentences of honest, encouraging feedback. No invented facts.`,
    messages: [{ role: "user", content: transcript }],
    output_config: { format: zodOutputFormat(SessionSummarySchema) },
  });
  const response = await stream.finalMessage();
  const p = response.parsed_output as z.infer<typeof SessionSummarySchema> | null;
  if (!p) throw new Error("Could not summarise the session. Please try again.");
  return { result: { rehearse: p.rehearse.slice(0, 3), overall: p.overall }, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
