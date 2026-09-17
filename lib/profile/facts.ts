/**
 * What the candidate told us about themselves beyond the résumé text: things said out loud in the
 * voice briefing and figures given to the "missing numbers" questions. They are real background —
 * the kit may use them and the truth check accepts them as a source.
 */
export interface NumberFact { bullet: string; value: string; context: string }
export interface ProfileFacts { achievements: string[]; tools: string[]; languages: string[]; numbers: NumberFact[] }

export const emptyFacts = (): ProfileFacts => ({ achievements: [], tools: [], languages: [], numbers: [] });
const MAX_PER_LIST = 30;
const MAX_LEN = 300;

/** Case-, accent- and spacing-insensitive key, so "Power BI" and "power bi" are one fact. */
export const factKey = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}%$+.,]+/gu, " ").replace(/[.,]+$/g, "").trim();

const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, MAX_LEN) : "");

function unionList(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...a, ...b]) {
    const v = clean(raw);
    const k = factKey(v);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.slice(-MAX_PER_LIST);
}

/** Tolerant reader for stored or client-sent JSON. */
export function parseFacts(v: unknown): ProfileFacts {
  let o: unknown = v;
  if (typeof v === "string") { try { o = JSON.parse(v); } catch { o = null; } }
  const f = (o && typeof o === "object" ? o : {}) as Partial<Record<keyof ProfileFacts, unknown>>;
  const list = (x: unknown) => (Array.isArray(x) ? x.map(clean).filter(Boolean) : []);
  const numbers = Array.isArray(f.numbers)
    ? f.numbers.map((n) => ({ bullet: clean((n as NumberFact)?.bullet), value: clean((n as NumberFact)?.value), context: clean((n as NumberFact)?.context) })).filter((n) => n.value)
    : [];
  return { achievements: list(f.achievements), tools: list(f.tools), languages: list(f.languages), numbers };
}

/** Union of two fact sets, de-duplicated; the newer copy of a repeated number wins. */
export function mergeFacts(a: ProfileFacts, b: ProfileFacts): ProfileFacts {
  const byKey = new Map<string, NumberFact>();
  for (const n of [...a.numbers, ...b.numbers]) {
    const v = { bullet: clean(n.bullet), value: clean(n.value), context: clean(n.context) };
    if (!v.value) continue;
    const k = `${factKey(v.bullet)}|${factKey(v.value)}`;
    byKey.delete(k);
    byKey.set(k, v);
  }
  return {
    achievements: unionList(a.achievements, b.achievements),
    tools: unionList(a.tools, b.tools),
    languages: unionList(a.languages, b.languages),
    numbers: [...byKey.values()].slice(-MAX_PER_LIST),
  };
}

export const factsCount = (f: ProfileFacts) => f.achievements.length + f.tools.length + f.languages.length + f.numbers.length;

/** Plain text for prompts and for the truth check's source text. */
export function factsText(f: ProfileFacts): string {
  const lines: string[] = [];
  if (f.achievements.length) lines.push(`Achievements: ${f.achievements.join("; ")}`);
  if (f.tools.length) lines.push(`Tools and skills: ${f.tools.join(", ")}`);
  if (f.languages.length) lines.push(`Languages: ${f.languages.join(", ")}`);
  for (const n of f.numbers) lines.push(`Figure: ${n.value}${n.context ? ` (${n.context})` : ""}${n.bullet ? ` — for: ${n.bullet}` : ""}`);
  return lines.join("\n");
}

/** Splits a free-text field ("Excel, Power BI e SQL") into items. */
export function splitList(text: string): string[] {
  return text.split(/[,;\n•·]|\s+(?:e|and|y)\s+/i).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 80);
}
