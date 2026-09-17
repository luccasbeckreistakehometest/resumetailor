import { extractKeywords, fold, keywordOverlap } from "@/lib/ats/check";

/**
 * The arithmetic of "am I a fit?". The model only judges each requirement (found / partial /
 * missing, with the evidence line); the score, the verdict and the three gaps that matter most
 * are computed here, so they are deterministic, explainable and unit-tested.
 */
export type FitStatus = "found" | "partial" | "missing";
export type FitWeight = "critical" | "important" | "nice";
export type FitVerdict = "strong" | "good" | "stretch" | "weak";

export interface FitItem { requirement: string; weight: FitWeight; status: FitStatus; evidence: string; advice: string }
export interface FitAnalysis { role: string; items: FitItem[]; summary: string }

export const WEIGHT_POINTS: Record<FitWeight, number> = { critical: 3, important: 2, nice: 1 };
const STATUS_CREDIT: Record<FitStatus, number> = { found: 1, partial: 0.5, missing: 0 };

/** Weighted share of requirement points the résumé earns, 0–100. Critical items count three times a nice-to-have. */
export function fitScore(items: FitItem[]): number {
  const total = items.reduce((a, i) => a + WEIGHT_POINTS[i.weight], 0);
  if (!total) return 0;
  const earned = items.reduce((a, i) => a + WEIGHT_POINTS[i.weight] * STATUS_CREDIT[i.status], 0);
  return Math.round((earned / total) * 100);
}

export const fitVerdict = (score: number): FitVerdict => (score >= 80 ? "strong" : score >= 60 ? "good" : score >= 40 ? "stretch" : "weak");

/** The gaps to close first: heaviest requirement first, a missing one before a partial one of the same weight. */
export function topGaps(items: FitItem[], n = 3): FitItem[] {
  return items
    .filter((i) => i.status !== "found")
    .sort((a, b) => WEIGHT_POINTS[b.weight] - WEIGHT_POINTS[a.weight] || STATUS_CREDIT[a.status] - STATUS_CREDIT[b.status])
    .slice(0, n);
}

/** What the cache key is built from: the same text with different spacing or casing is the same check. */
export const canonical = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

const WEIGHTS: FitWeight[] = ["critical", "critical", "critical", "important", "important", "important", "nice", "nice"];
const ADVICE: Record<"en" | "pt" | "es", Record<FitStatus, (k: string) => string>> = {
  en: { found: (k) => `Lead with "${k}" — put it in the summary and one bullet with a number. [demo]`, partial: (k) => `Name the closest thing you did to "${k}", honestly. [demo]`, missing: (k) => `"${k}" isn't in your background: a short course or a side project would close it — don't claim it. [demo]` },
  pt: { found: (k) => `Abre com "${k}" — coloca no resumo e num tópico com número. [demo]`, partial: (k) => `Cita a coisa mais próxima de "${k}" que você fez, sem inventar. [demo]`, missing: (k) => `"${k}" não está na sua história: um curso curto ou um projeto pessoal fecha esse buraco — não finge que tem. [demo]` },
  es: { found: (k) => `Abre con "${k}" — ponlo en el resumen y en una viñeta con un número. [demo]`, partial: (k) => `Nombra lo más cercano a "${k}" que hiciste, con honestidad. [demo]`, missing: (k) => `"${k}" no está en tu historia: un curso corto o un proyecto propio lo cierra — no lo inventes. [demo]` },
};
const SUMMARY: Record<"en" | "pt" | "es", (f: number, n: number) => string> = {
  en: (f, n) => `You cover ${f} of the ${n} requirements the posting weighs most. [demo — fixture, not an AI result]`,
  pt: (f, n) => `Você cobre ${f} dos ${n} requisitos que mais pesam nessa vaga. [demo — resultado de teste, não da IA]`,
  es: (f, n) => `Cubres ${f} de los ${n} requisitos que más pesan en la oferta. [demo — resultado de prueba, no de la IA]`,
};

/** A deterministic analysis built from the posting's own vocabulary, so demos and e2e runs reflect the real inputs. */
export function mockFit(posting: string, resume: string, lang: "en" | "pt" | "es"): FitAnalysis {
  const keywords = extractKeywords(posting, 8);
  const { matched } = keywordOverlap(resume, keywords);
  const lines = resume.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: FitItem[] = keywords.map((k, i) => {
    const status: FitStatus = matched.includes(k) ? "found" : "missing";
    const evidence = status === "found" ? (lines.find((l) => fold(l).includes(k)) ?? "").slice(0, 160) : "";
    return { requirement: k, weight: WEIGHTS[i] ?? "nice", status, evidence, advice: ADVICE[lang][status](k) };
  });
  const role = (posting.split("\n").map((l) => l.trim()).find(Boolean) ?? "").slice(0, 80);
  return { role, items, summary: SUMMARY[lang](items.filter((i) => i.status === "found").length, items.length) };
}
