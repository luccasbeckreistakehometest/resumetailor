import { extractKeywords, fold, keywordOverlap } from "@/lib/ats/check";

/**
 * How much a tailored résumé actually engages with the posting — the quality-over-volume guard.
 * Recruiters are drowning in generic AI applications; a kit that mirrors none of the posting's
 * vocabulary and makes no specific claims is one of them, however polished it reads.
 */
export interface Personalisation {
  /** 0–100: 60% keyword coverage of the posting, 40% share of bullets that make a specific claim */
  score: number;
  coverage: number;
  specific: number;
  bullets: number;
  matched: string[];
  missing: string[];
  generic: boolean;
}

export const GENERIC_BELOW = 55;
const BULLET = /^\s*(?:[-•*–—▪▫◦●○►➤✓✔·]|\d{1,2}[.)])\s+\S/;
const YEAR = /\b(?:19|20)\d{2}\b/g;

export function personalisation(resume: string, jobDescription: string): Personalisation | null {
  if ((jobDescription ?? "").trim().length < 30 || !(resume ?? "").trim()) return null;
  const keywords = extractKeywords(jobDescription, 20);
  const { matched, missing, coverage } = keywordOverlap(resume, keywords);
  const bulletLines = resume.replace(/\r/g, "").split("\n").filter((l) => BULLET.test(l));
  // a specific claim carries a figure that is not a year, or names one of the posting's own terms
  const specific = bulletLines.filter((l) => /\d/.test(l.replace(YEAR, "")) || keywords.some((k) => fold(l).includes(k))).length;
  const claimRatio = bulletLines.length ? specific / bulletLines.length : 0;
  const score = Math.round(0.6 * (coverage ?? 0) + 0.4 * Math.min(100, (claimRatio / 0.6) * 100));
  return { score, coverage: coverage ?? 0, specific, bullets: bulletLines.length, matched, missing, generic: score < GENERIC_BELOW };
}
