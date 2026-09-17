import type { Kit, Lang } from "@/lib/ai/kit";

/**
 * The parts of a mock interview that need no AI: which questions a kit yields, and how a set of
 * scored answers rolls up into a session summary. Kept pure so they are unit-tested directly.
 */
export type QuestionKind = "opener" | "behavioral" | "technical";
export interface Question { kind: QuestionKind; text: string }
export type Dimension = "structure" | "specificity" | "relevance";
export interface Scores { structure: number; specificity: number; relevance: number }
export interface Turn {
  questionIdx: number; answer: string; source: "voice" | "text"; scores: Scores; coaching: string[]; modelAnswer: string; at: string;
}

/** A locked kit gets a taste; an unlocked one gets the whole conversation. */
export const PREVIEW_QUESTIONS = 2;
export const MAX_QUESTIONS = 8;
export const DIMENSIONS: Dimension[] = ["structure", "specificity", "relevance"];

const OPENER: Record<Lang, (role: string) => string> = {
  en: (r) => `To start: walk me through your background and why ${r ? `the ${r} role` : "this role"} interests you.`,
  pt: (r) => `Pra começar: me conta um pouco da sua trajetória e por que ${r ? `a vaga de ${r}` : "essa vaga"} te interessa.`,
  es: (r) => `Para empezar: cuéntame tu trayectoria y por qué te interesa ${r ? `el puesto de ${r}` : "este puesto"}.`,
};
// The kit's behavioral items are sometimes questions and sometimes topics ("a campaign that
// failed"). A topic is framed so the candidate hears where the STAR pieces go.
const BEHAVIORAL: Record<Lang, (t: string) => string> = {
  en: (t) => `Tell me about a specific situation — ${t}. What was going on, what did you do, and what came of it?`,
  pt: (t) => `Me conta uma situação concreta — ${t}. O que estava acontecendo, o que você fez e qual foi o resultado?`,
  es: (t) => `Cuéntame una situación concreta — ${t}. ¿Qué estaba pasando, qué hiciste y cuál fue el resultado?`,
};
const TECHNICAL: Record<Lang, (t: string) => string> = {
  en: (t) => `Let's get technical: ${t}. How have you applied this in practice, and what trade-offs did you run into?`,
  pt: (t) => `Vamos pro lado técnico: ${t}. Como você já aplicou isso na prática e que trade-offs apareceram?`,
  es: (t) => `Vamos a lo técnico: ${t}. ¿Cómo lo has aplicado en la práctica y qué compromisos encontraste?`,
};

const isQuestion = (t: string) => /\?\s*$/.test(t.trim());
const lowerFirst = (t: string) => t.trim().replace(/^[A-ZÀ-Ü]/, (c) => c.toLowerCase()).replace(/[.。]\s*$/, "");

export function buildQuestions(kit: Pick<Kit, "interviewPrep">, targetRole: string, lang: Lang, preview: boolean): Question[] {
  const role = (targetRole || "").trim().slice(0, 80);
  const list: Question[] = [{ kind: "opener", text: OPENER[lang](role) }];
  for (const b of kit.interviewPrep.behavioral) {
    const text = b.trim(); if (!text) continue;
    list.push({ kind: "behavioral", text: isQuestion(text) ? text : BEHAVIORAL[lang](lowerFirst(text)) });
  }
  for (const t of kit.interviewPrep.technical) {
    const text = t.trim(); if (!text) continue;
    list.push({ kind: "technical", text: isQuestion(text) ? text : TECHNICAL[lang](lowerFirst(text)) });
  }
  return list.slice(0, preview ? PREVIEW_QUESTIONS : MAX_QUESTIONS);
}

export const clampScore = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export const overallOf = (s: Scores): number => round1((s.structure + s.specificity + s.relevance) / 3);

export interface Aggregate {
  answered: number;
  perQuestion: { questionIdx: number; overall: number; scores: Scores }[];
  averages: Scores;
  weakest: Dimension | null;
  overall: number;
}

/** Rolls the turns up; the weakest dimension is the one to rehearse first (ties keep STAR first). */
export function aggregate(turns: Turn[]): Aggregate {
  const perQuestion = turns.map((t) => ({ questionIdx: t.questionIdx, overall: overallOf(t.scores), scores: t.scores }));
  if (!turns.length) return { answered: 0, perQuestion, averages: { structure: 0, specificity: 0, relevance: 0 }, weakest: null, overall: 0 };
  const avg = (k: Dimension) => round1(turns.reduce((a, t) => a + t.scores[k], 0) / turns.length);
  const averages = { structure: avg("structure"), specificity: avg("specificity"), relevance: avg("relevance") };
  let weakest: Dimension = "structure";
  for (const d of DIMENSIONS) if (averages[d] < averages[weakest]) weakest = d;
  return { answered: turns.length, perQuestion, averages, weakest, overall: round1(perQuestion.reduce((a, q) => a + q.overall, 0) / perQuestion.length) };
}
