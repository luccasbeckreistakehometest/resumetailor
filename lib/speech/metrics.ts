/**
 * Delivery metrics from what was said and how long it took: words per minute, filler words per
 * 100 words, repeated words and the longest pause (when timestamps exist). Bands, not verdicts —
 * no pseudo-science. Pure; used by the mock interview and the pitch studio.
 */
export type SpeechLang = "en" | "pt" | "es";
export interface Delivery {
  words: number; seconds: number; wpm: number; fillers: number; fillersPer100: number;
  fillerWords: { word: string; count: number }[]; repeated: { word: string; count: number }[];
  longestPauseSec: number | null; pace: "slow" | "good" | "fast" | null;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Single words and short phrases; matched on word boundaries after accent folding. */
export const FILLERS: Record<SpeechLang, string[]> = {
  pt: ["ne", "tipo", "entao", "ai", "hum", "sabe", "eh", "e e", "tipo assim", "basicamente"],
  en: ["um", "uh", "erm", "like", "you know", "basically", "i mean", "sort of", "kind of"],
  es: ["este", "o sea", "pues", "eh", "bueno", "osea", "digamos", "tipo"],
};
/** How a folded filler is shown back to the person. */
const DISPLAY: Record<string, string> = { ne: "né", entao: "então", ai: "aí", eh: "é…", "e e": "é é" };

const STOP: Record<SpeechLang, Set<string>> = {
  pt: new Set("a o as os e de da do das dos em no na nos nas um uma que eu com por para pra se nao mais foi muito me meu minha isso esse essa ao".split(" ")),
  en: new Set("a an the and of to in on for with i my me it is was that this at as be by or we our you".split(" ")),
  es: new Set("a el la los las y de del en con por para un una que yo mi me es fue se lo al no mas".split(" ")),
};

export const wordsOf = (text: string) => fold(text).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

export function deliveryMetrics(text: string, seconds: number, lang: SpeechLang, resultTimes?: number[]): Delivery {
  const words = wordsOf(text);
  const joined = ` ${words.join(" ")} `;
  const fillerWords: { word: string; count: number }[] = [];
  for (const f of FILLERS[lang]) {
    const count = joined.split(` ${f} `).length - 1;
    if (count > 0) fillerWords.push({ word: DISPLAY[f] ?? f, count });
  }
  // "tipo assim" also contains "tipo": count the longer phrase once.
  const fillers = fillerWords.reduce((a, f) => a + f.count, 0) - overlap(fillerWords);
  const counts = new Map<string, number>();
  for (const w of words) if (w.length > 3 && !STOP[lang].has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => ({ word, count }));
  const wpm = seconds > 0 ? Math.round((words.length / seconds) * 60) : 0;
  let longestPauseSec: number | null = null;
  if (resultTimes && resultTimes.length > 1) {
    const sorted = [...resultTimes].sort((a, b) => a - b);
    longestPauseSec = Math.round(Math.max(...sorted.slice(1).map((t, i) => t - sorted[i])) / 100) / 10;
  }
  return {
    words: words.length, seconds: Math.round(seconds), wpm, fillers,
    fillersPer100: words.length ? Math.round((fillers / words.length) * 1000) / 10 : 0,
    fillerWords, repeated, longestPauseSec,
    pace: words.length < 10 || seconds < 5 ? null : wpm < 110 ? "slow" : wpm > 165 ? "fast" : "good",
  };
}

function overlap(found: { word: string; count: number }[]): number {
  let extra = 0;
  for (const long of found) {
    if (!long.word.includes(" ")) continue;
    for (const part of long.word.split(" ")) if (found.some((f) => f.word === (DISPLAY[part] ?? part))) extra += long.count;
  }
  return extra;
}

/** The pace a script of N words needs for a target length (for the teleprompter and the script call). */
export const targetWords = (seconds: number) => Math.round((seconds / 60) * 130);
