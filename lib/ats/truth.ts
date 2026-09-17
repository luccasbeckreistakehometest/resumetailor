import { parseResume } from "@/lib/resume/sections";

/**
 * The truth check: every number, year, employer, degree and language level in the kit is looked
 * up in what the CANDIDATE gave us (résumé, profile, things said out loud, answers) — never in the
 * job posting. What is not found is listed for the person to confirm or fix. Pure, no AI.
 */
export type TruthKind = "number" | "year" | "org" | "degree" | "language" | "skill";
export interface TruthItem { key: string; kind: TruthKind; text: string; line: string; section: string }
export interface TruthReport { checked: number; unverified: TruthItem[] }

export const foldText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, quinze: 15, vinte: 20,
  uno: 1, dos: 2, cuatro: 4, siete: 7, ocho: 8, nueve: 9, diez: 10,
};
const SCALE: [RegExp, number][] = [
  [/^(bi|bilh[aoõ]es|bilh[aã]o|billions?|billones?|b)$/, 1e9],
  [/^(mi|mm|milh[aoõ]es|milh[aã]o|millions?|millones|mill[oó]n|m)$/, 1e6],
  [/^(mil|k|thousand)$/, 1e3],
];
const NUMBER_RE = /(?<![\w/])([+-]?)(R\$|US\$|\$|€|£)?\s?(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d+)?)\s?(%|x\b|×|(?:bi|bilh(?:ão|ões|ao|oes)|billions?|mi|mm|milh(?:ão|ões|ao|oes)|millions?|millones|mill[oó]n|mil|k|m|b)\b)?/giu;

export interface NumberFact { value: number; unit: "pct" | "x" | "plain"; money: boolean; raw: string }

function toNumber(digits: string): number {
  const s = digits.replace(/\s/g, "");
  // "1.234.567" / "1,234" as thousands; "1,2" / "1.5" as decimals.
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  return Number(s.replace(",", "."));
}

export function numbersIn(text: string): NumberFact[] {
  const out: NumberFact[] = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const [raw, , cur, digits, suffixRaw] = m;
    let value = toNumber(digits);
    if (!Number.isFinite(value)) continue;
    const suffix = foldText(suffixRaw ?? "").trim();
    let unit: NumberFact["unit"] = "plain";
    if (suffix === "%") unit = "pct";
    else if (suffix === "x" || suffix === "×") unit = "x";
    else if (suffix) {
      const scale = SCALE.find(([re]) => re.test(suffix));
      // A bare "m"/"b" only scales money ("$12M"), never "12 m" of anything else.
      if (scale && (cur || suffix.length > 1)) value *= scale[1];
    }
    out.push({ value, unit, money: !!cur, raw: raw.trim() });
  }
  for (const w of foldText(text).match(/\b[a-z]+\b/g) ?? []) if (WORD_NUMBERS[w]) out.push({ value: WORD_NUMBERS[w], unit: "plain", money: false, raw: w });
  return out;
}

const isYear = (n: NumberFact) => n.unit === "plain" && !n.money && Number.isInteger(n.value) && n.value >= 1950 && n.value <= 2099 && /^\d{4}$/.test(n.raw);
const same = (a: NumberFact, b: NumberFact) => Math.abs(a.value - b.value) <= Math.max(0.001, Math.abs(a.value) * 0.001) && (a.unit === b.unit || a.unit === "plain" || b.unit === "plain");

/** Contact lines and phone numbers are not claims. */
const skipLine = (line: string) => /@|https?:|www\.|\+\d{2}\s?\(?\d|\(\d{2}\)\s?\d{4}/.test(line);

export const DEGREE_TERMS = [
  "mba", "phd", "ph.d", "doutorado", "doctorado", "mestrado", "maestria", "master's", "masters", "msc", "m.sc", "bachelor", "bacharelado", "licenciatura", "licenciado",
  "pos-graduacao", "posgrado", "especializacao", "especializacion", "tecnologo", "tecnico em", "pmp", "cpa", "cfa", "cpa-20", "cea", "cissp", "scrum master", "psm", "cspo",
  "aws certified", "azure certified", "google certified", "itil", "six sigma", "green belt", "black belt", "prince2", "oab", "crea", "crc",
];
const LANGS = "ingles|english|ingl[eé]s|espanhol|spanish|espanol|español|castellano|frances|french|franc[eé]s|alemao|german|aleman|italiano|italian|mandarim|mandarin|chines|chinese|japones|japanese|portugues|portuguese";
const LEVELS: [RegExp, number][] = [
  [/nativ|native|materna|bilingu/, 6], [/\bc2\b|proficien/, 5], [/fluent|fluente|\bc1\b/, 4],
  [/avancad|advanced|avanzad|\bb2\b/, 3], [/intermedi|\bb1\b/, 2], [/basic|basico|\ba2\b|\ba1\b|elementar|beginner|iniciante/, 1],
];
const levelOf = (s: string) => LEVELS.find(([re]) => re.test(s))?.[1] ?? 0;
function languageLevels(text: string): Map<string, { level: number; raw: string }> {
  const out = new Map<string, { level: number; raw: string }>();
  const f = foldText(text);
  const re = new RegExp(`\\b(${LANGS})\\b[^\\n.;·|]{0,30}`, "g");
  for (const m of f.matchAll(re)) {
    const level = levelOf(m[0]);
    if (!level) continue;
    const lang = m[1].replace(/ingl[eé]s|english/, "en").replace(/espanhol|spanish|espanol|español|castellano/, "es").replace(/frances|french|franc[eé]s/, "fr").replace(/alemao|german|aleman/, "de");
    const prev = out.get(lang);
    if (!prev || level > prev.level) out.set(lang, { level, raw: m[0].trim() });
  }
  return out;
}

const keyOf = (kind: TruthKind, text: string) => `${kind}:${foldText(text).replace(/\s+/g, " ").trim()}`;

export function truthCheck(input: { kitText: string; sources: string[]; addedSkills?: string[] }): TruthReport {
  const source = input.sources.filter(Boolean).join("\n");
  const sourceFold = foldText(source);
  const sourceNumbers = numbersIn(source);
  const items: TruthItem[] = [];
  const seen = new Set<string>();
  let checked = 0;
  const push = (kind: TruthKind, text: string, line: string, section: string) => {
    const key = keyOf(kind, text);
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ key, kind, text, line: line.trim().slice(0, 200), section });
  };

  let section = "";
  const lines = input.kitText.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line) => {
    const h = line.match(/^#{2,3}\s+(.*)/);
    if (h) { section = h[1].trim(); return; }
    if (skipLine(line) || !line.trim()) return;
    for (const n of numbersIn(line.replace(/^#\s.*/, ""))) {
      if (n.unit === "plain" && !n.money && n.value < 2 && !isYear(n)) continue;   // "1 team" is not a claim worth checking
      if (/^[a-z]+$/.test(n.raw)) continue;                                         // spelled numbers only count as sources
      checked++;
      if (isYear(n)) { if (!sourceNumbers.some((s) => isYear(s) && s.value === n.value)) push("year", n.raw, line, section); continue; }
      if (!sourceNumbers.some((s) => !isYear(s) && same(n, s))) push("number", n.raw, line, section);
    }
    const f = foldText(line);
    for (const term of DEGREE_TERMS) {
      if (new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(f)) {
        checked++;
        if (!new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(sourceFold)) push("degree", term.toUpperCase().length <= 5 ? term.toUpperCase() : term, line, section);
      }
    }
  });

  // Employers and schools named in the experience / education entries.
  const parsed = parseResume(input.kitText);
  for (const s of parsed?.sections ?? []) {
    for (const e of s.entries ?? []) {
      const org = e.org.replace(/\*\*/g, "").trim();
      if (!org || org.length < 2) continue;
      checked++;
      if (!sourceFold.includes(foldText(org))) push("org", org, `${e.title} — ${org}`, s.heading);
    }
  }

  // Language levels: never higher than what the candidate said.
  const kitLevels = languageLevels(input.kitText);
  const srcLevels = languageLevels(source);
  for (const [lang, k] of kitLevels) {
    checked++;
    const s = srcLevels.get(lang);
    if (!s || k.level > s.level) push("language", k.raw, k.raw, "");
  }

  for (const skill of input.addedSkills ?? []) {
    checked++;
    if (!sourceFold.includes(foldText(skill))) push("skill", skill, skill, "");
  }
  return { checked, unverified: items };
}

/**
 * Lines the person typed themselves (in the editor) count as their own words: every line that
 * a "user" version added relative to the version before it.
 */
export function userAddedLines(versions: { text: string; source: string }[]): string {
  const out: string[] = [];
  for (let i = 1; i < versions.length; i++) {
    if (versions[i].source !== "user") continue;
    const before = new Set(versions[i - 1].text.split("\n").map((l) => l.trim()));
    for (const l of versions[i].text.split("\n")) if (l.trim() && !before.has(l.trim())) out.push(l);
  }
  return out.join("\n");
}

/** Every number and year of the original must survive a rewrite (used for the international version). */
export function missingNumbers(original: string, rewrite: string): string[] {
  const after = numbersIn(rewrite);
  const missing: string[] = [];
  for (const n of numbersIn(original)) {
    if (/^[a-z]+$/.test(n.raw) || (n.unit === "plain" && n.value < 2)) continue;
    if (!after.some((a) => (isYear(n) ? isYear(a) && a.value === n.value : same(n, a)))) missing.push(n.raw);
  }
  return [...new Set(missing)];
}
