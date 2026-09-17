import { extractKeywords, keywordOverlap } from "@/lib/ats/check";

/**
 * The LinkedIn pass, minus the writing: which words the target role is searched by, and how
 * many of them the rewritten profile carries. LinkedIn search and recruiter filters match on
 * headline, About and Skills text, so coverage here is the honest proxy for "will I be found".
 */
export interface LinkedInProfile {
  headlines: string[];
  about: string;
  experience: { title: string; company: string; period: string; bullets: string[] }[];
  skills: string[];
  notes: string;
}
export interface Coverage { vocabulary: string[]; matched: string[]; missing: string[]; coverage: number }

/** The posting's own vocabulary when the kit was tailored to one; the kit's keyword list otherwise. */
export function roleVocabulary(posting: string, kitKeywords: { term: string }[]): string[] {
  if ((posting ?? "").trim().length >= 30) return extractKeywords(posting, 20);
  return kitKeywords.map((k) => k.term.trim().toLowerCase()).filter(Boolean).slice(0, 20);
}

export const profileText = (p: LinkedInProfile): string =>
  [...p.headlines, p.about, ...p.experience.flatMap((e) => [e.title, e.company, ...e.bullets]), ...p.skills].join("\n");

export function linkedinCoverage(profile: LinkedInProfile, vocabulary: string[]): Coverage {
  const { matched, missing, coverage } = keywordOverlap(profileText(profile), vocabulary);
  return { vocabulary, matched, missing, coverage: coverage ?? 0 };
}

/** Everything a person needs to paste, in order, as one text. */
export function profileAsText(p: LinkedInProfile, labels: { headline: string; about: string; experience: string; skills: string }): string {
  return [
    `${labels.headline}\n${p.headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
    `${labels.about}\n${p.about}`,
    `${labels.experience}\n${p.experience.map((e) => `${e.title} — ${e.company}${e.period ? ` (${e.period})` : ""}\n${e.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")}`,
    `${labels.skills}\n${p.skills.join(" · ")}`,
  ].join("\n\n");
}
