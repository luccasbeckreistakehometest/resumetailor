/**
 * The free ATS check. Pure heuristics over pasted text — no AI, no network, nothing stored —
 * so it can run for anyone, instantly, without an account. It answers the questions a parser
 * (Gupy, Workday, Greenhouse…) effectively asks: can I find your contact details, your sections,
 * your dates; are your bullets concrete; do you use the posting's words; is the layout parseable.
 */
export type Lang = "en" | "pt" | "es";
export type Severity = "high" | "medium" | "low";
export type CheckId =
  | "contact" | "summary" | "experience" | "education" | "skills"
  | "dates" | "bullets" | "quantified" | "length" | "keywords"
  | "format_tables" | "format_images" | "format_symbols" | "format_personal" | "format_caps";

export interface Check {
  id: CheckId; ok: boolean; severity: Severity;
  /** points this check is worth */ max: number;
  /** points earned */ earned: number;
  /** what fixing it would add to the score */ gain: number;
  detail: Record<string, number>;
}
export interface Stats { words: number; lines: number; bullets: number; quantified: number; dateMentions: number; longBullets: number }
export interface AtsResult {
  score: number; grade: "A" | "B" | "C" | "D";
  checks: Check[]; fixes: Check[];
  keywords: { matched: string[]; missing: string[]; coverage: number | null };
  stats: Stats;
  hasPosting: boolean;
}

/* ---------- text helpers ---------- */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const lines = (s: string) => s.replace(/\r/g, "").split("\n");
const nonEmpty = (ls: string[]) => ls.map((l) => l.trim()).filter(Boolean);
export const wordCount = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’+#.-]*/gu) ?? []).length;

const BULLET = /^\s*(?:[-•*–—▪▫◦●○►➤✓✔·]|\d{1,2}[.)])\s+\S/;
const YEAR = /\b(?:19|20)\d{2}\b/g;
const MONTH = /\b(?:jan|feb|fev|mar|apr|abr|may|mai|jun|jul|aug|ago|sep|set|oct|out|nov|dec|dez|january|february|march|april|june|july|august|september|october|november|december|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|enero|febrero|marzo|mayo|junio|julio|septiembre|octubre|noviembre|diciembre)\b\.?\s*(?:de\s+|\/|-)?\s*(?:19|20)\d{2}/gi;
const PRESENT = /\b(?:present|current|now|atual|atualmente|hoje|o momento|actual|actualidad|presente)\b/i;

const HEADINGS: Record<Exclude<CheckId, "contact" | "dates" | "bullets" | "quantified" | "length" | "keywords" | `format_${string}`>, RegExp> = {
  summary: /^(?:#+\s*)?(?:professional\s+)?(?:summary|profile|about(?:\s+me)?|objective|resumo(?:\s+profissional)?|perfil(?:\s+profissional)?|objetivo(?:\s+profissional)?|sobre(?:\s+mim)?|apresentacao|resumen(?:\s+profesional)?|extracto)\b/,
  experience: /^(?:#+\s*)?(?:(?:work|professional|relevant)\s+)?(?:experience|work\s+history|employment(?:\s+history)?|experiencia(?:\s+profissional|\s+laboral)?|historico\s+profissional|trajetoria(?:\s+profissional)?|atuacao\s+profissional|historial\s+laboral)\b/,
  education: /^(?:#+\s*)?(?:education|academic(?:s|\s+background)?|formacao(?:\s+academica)?|educacao|escolaridade|educacion|formacion(?:\s+academica)?|estudios)\b/,
  skills: /^(?:#+\s*)?(?:(?:technical|core|key|hard|soft)\s+)?(?:skills|competenc(?:ies|ias)|habilidades|ferramentas|tecnologias|conhecimentos|idiomas|languages|herramientas|tools|tecnologias\s+e\s+ferramentas)\b/,
};

function findHeading(ls: string[], re: RegExp): boolean {
  return ls.some((l) => { const f = fold(l).trim(); return f.length <= 60 && wordCount(f) <= 6 && re.test(f); });
}

/* ---------- keywords ---------- */
const STOP = new Set(("a an and are as at be by for from has have in into is it its of on or that the this to with will you your we our " +
  "o a os as um uma uns umas e ou de do da dos das em no na nos nas por para pra com sem que se sua seu suas seus ao aos à às como mais muito ser ter são está esta este esse essa isso " +
  "el la los las un una unos unas y o de del al en con sin por para que se su sus como mas muy ser tener son esta este ese esa esto").split(/\s+/));
// Words every posting uses that say nothing about the job itself.
const GENERIC = new Set(("experience experiences work working job role position team company candidate candidates ability strong skills skill required requirements requirement responsibilities responsibility " +
  "years year plus preferred including etc opportunity opportunities benefits salary apply application full time part remote hybrid office location about who what looking must should nice good great excellent " +
  "vaga vagas empresa equipe time candidato candidatos conhecimento conhecimentos desejavel diferencial requisitos requisito atividades responsabilidades anos ano necessario trabalho trabalhar area nivel superior completo cursando ensino beneficios salario " +
  "oportunidade oportunidades sobre nos buscamos procuramos voce quem somos horario presencial remoto hibrido regime clt pj vale " +
  // verbs every posting leans on; they describe the act of having a job, not this job
  "own run manage manages managing lead leads drive drives support ensure deliver develop build help join make take provide maintain perform create hands-on hands " +
  "atuar atuara realizar garantir apoiar desenvolver construir ajudar fazer prover manter executar criar acompanhar participar " +
  "gestionar liderar impulsar apoyar asegurar entregar desarrollar construir ayudar hacer proveer mantener realizar crear participar " +
  "empleo empresa equipo candidato candidatos conocimiento conocimientos deseable requisitos responsabilidades anos experiencia buscamos ofrecemos beneficios salario oportunidad sobre nosotros quien somos horario presencial remoto hibrido").split(/\s+/));

const tokens = (s: string) => (fold(s).match(/[a-z0-9][a-z0-9+#.-]*[a-z0-9+#]|[a-z0-9]/g) ?? []).filter((t) => t.length >= 3 && !/^\d+$/.test(t));

/** The posting's own vocabulary, by frequency: single words plus the two-word phrases it repeats. */
export function extractKeywords(posting: string, limit = 25): string[] {
  const ts = tokens(posting).filter((t) => !STOP.has(t) && !GENERIC.has(t));
  const uni = new Map<string, number>();
  const bi = new Map<string, number>();
  for (let i = 0; i < ts.length; i++) {
    uni.set(ts[i], (uni.get(ts[i]) ?? 0) + 1);
    if (i + 1 < ts.length) { const b = `${ts[i]} ${ts[i + 1]}`; bi.set(b, (bi.get(b) ?? 0) + 1); }
  }
  const bigrams = [...bi.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  const inBigram = new Set(bigrams.flatMap((b) => b.split(" ")));
  const unigrams = [...uni.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([k]) => k)
    .filter((k) => !inBigram.has(k));
  return [...bigrams, ...unigrams].slice(0, limit);
}

/** Same word in another form (managed / management, analyst / analysis): a shared stem of six letters or more. */
export function related(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  if (n < 6) return false;
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i >= 6 && i >= n - 3;
}

/** A keyword counts as present when its token — or a close inflection — appears; phrases match verbatim or by every word. */
export function keywordOverlap(resume: string, keywords: string[]): { matched: string[]; missing: string[]; coverage: number | null } {
  if (!keywords.length) return { matched: [], missing: [], coverage: null };
  const text = fold(resume);
  const toks = [...new Set(tokens(resume))];
  const one = (k: string) => toks.some((t) => related(t, k));
  const has = (k: string) => (k.includes(" ") ? text.includes(k) || k.split(" ").every(one) : one(k));
  const matched = keywords.filter(has);
  const missing = keywords.filter((k) => !matched.includes(k));
  return { matched, missing, coverage: Math.round((matched.length / keywords.length) * 100) };
}

/* ---------- the check ---------- */
const WEIGHTS: Record<CheckId, { max: number; severity: Severity }> = {
  contact: { max: 8, severity: "high" }, summary: { max: 4, severity: "low" }, experience: { max: 10, severity: "high" }, education: { max: 5, severity: "medium" }, skills: { max: 6, severity: "medium" },
  dates: { max: 8, severity: "high" }, bullets: { max: 8, severity: "medium" }, quantified: { max: 12, severity: "high" }, length: { max: 6, severity: "medium" }, keywords: { max: 20, severity: "high" },
  format_tables: { max: 4, severity: "medium" }, format_images: { max: 2, severity: "medium" }, format_symbols: { max: 2, severity: "low" }, format_personal: { max: 3, severity: "low" }, format_caps: { max: 2, severity: "low" },
};

const SYMBOLS = /[☀-➿←-⇿⬀-⯿\u{1F300}-\u{1FAFF}]/gu;   // icons and emoji; plain bullets (•, ‣) are outside these ranges

export function atsCheck(resumeText: string, posting = ""): AtsResult {
  const raw = resumeText ?? "";
  const ls = lines(raw);
  const body = nonEmpty(ls);
  const words = wordCount(raw);
  const checks: Check[] = [];
  const add = (id: CheckId, earned: number, detail: Record<string, number> = {}, okAt = 0.75) => {
    const { max, severity } = WEIGHTS[id];
    const e = Math.max(0, Math.min(max, Math.round(earned)));
    checks.push({ id, ok: e >= max * okAt, severity, max, earned: e, gain: max - e, detail });
  };

  // contact: an email plus a phone or a LinkedIn handle
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(raw) ? 1 : 0;
  const phone = /(?:\+?\d[\d ().-]{7,}\d)/.test(raw) ? 1 : 0;
  const linkedin = /linkedin\.com\/in\//i.test(raw) ? 1 : 0;
  add("contact", email ? (phone || linkedin ? 8 : 5) : phone || linkedin ? 3 : 0, { email, phone, linkedin });

  // sections
  add("summary", findHeading(ls, HEADINGS.summary) ? 4 : 0);
  add("experience", findHeading(ls, HEADINGS.experience) ? 10 : 0);
  add("education", findHeading(ls, HEADINGS.education) ? 5 : 0);
  add("skills", findHeading(ls, HEADINGS.skills) ? 6 : 0);

  // dates: years or month-year pairs; "present" counts as one
  const dateMentions = (raw.match(YEAR)?.length ?? 0) + (raw.match(MONTH)?.length ?? 0) / 2 + (PRESENT.test(raw) ? 1 : 0);
  add("dates", dateMentions >= 3 ? 8 : dateMentions >= 1 ? 4 : 0, { mentions: Math.round(dateMentions) });

  // bullets and how many carry a number that is not a year
  const bulletLines = body.filter((l) => BULLET.test(l));
  const bullets = bulletLines.length;
  const quantified = bulletLines.filter((l) => /\d/.test(l.replace(YEAR, ""))).length;
  const longBullets = bulletLines.filter((l) => wordCount(l) > 40).length;
  add("bullets", bullets >= 6 ? 8 : (8 * bullets) / 6, { bullets, longBullets });
  const ratio = bullets ? quantified / bullets : 0;
  add("quantified", bullets ? 12 * Math.min(1, ratio / 0.4) : 0, { quantified, bullets, ratio: Math.round(ratio * 100) });

  // length: one to two pages of real content
  add("length", words >= 300 && words <= 900 ? 6 : (words >= 200 && words < 300) || (words > 900 && words <= 1200) ? 3 : 0, { words });

  // keywords vs the posting
  const kw = posting.trim().length >= 30 ? keywordOverlap(raw, extractKeywords(posting)) : { matched: [], missing: [], coverage: null as number | null };
  const hasPosting = kw.coverage !== null;
  // 60% of a posting's own top words is already a well-mirrored résumé; the rest are usually boilerplate.
  if (hasPosting) add("keywords", (20 * (kw.coverage ?? 0)) / 100, { matched: kw.matched.length, total: kw.matched.length + kw.missing.length, coverage: kw.coverage ?? 0 }, 0.6);

  // format red flags — hints that survive a paste from a two-column, table-driven or icon-heavy design
  const tableLines = body.filter((l) => /\t/.test(l) || /\S {3,}\S/.test(l) || (l.match(/\|/g)?.length ?? 0) >= 2).length;
  add("format_tables", tableLines >= 3 ? 0 : tableLines >= 1 ? 2 : 4, { lines: tableLines });
  const images = (raw.match(/\[(?:image|imagem|imagen|foto|photo)\]|\.(?:png|jpe?g|gif|svg)\b|<img/gi)?.length ?? 0);
  add("format_images", images ? 0 : 2, { images });
  const symbols = raw.match(SYMBOLS)?.length ?? 0;
  add("format_symbols", symbols >= 3 ? 0 : 2, { symbols });
  const personal = (fold(raw).match(/\b(?:cpf|rg|estado civil|casad[oa]|solteir[oa]|data de nascimento|date of birth|marital status|estado civil|fecha de nacimiento|idade:|age:|edad:)\b/g)?.length ?? 0);
  add("format_personal", personal ? 0 : 3, { hits: personal });
  const capsLines = body.filter((l) => /[A-ZÀ-Ü]{3,}/.test(l) && l === l.toUpperCase() && wordCount(l) >= 3).length;
  add("format_caps", body.length && capsLines / body.length > 0.3 ? 0 : 2, { lines: capsLines });

  const max = checks.reduce((a, c) => a + c.max, 0);
  const earned = checks.reduce((a, c) => a + c.earned, 0);
  const score = words < 20 ? 0 : Math.round((earned / max) * 100);
  const fixes = checks.filter((c) => c.gain >= 1).sort((a, b) => b.gain - a.gain || (a.severity === "high" ? -1 : 1));
  return {
    score, grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D",
    checks, fixes, keywords: kw, hasPosting,
    stats: { words, lines: body.length, bullets, quantified, dateMentions: Math.round(dateMentions), longBullets },
  };
}

/* ---------- share card: enough to redraw the result, never the résumé itself ---------- */
export interface ShareCard { s: number; g: AtsResult["grade"]; f: CheckId[]; k: number | null; l: Lang }

// The check runs in the browser, so the token has to be built without Node's Buffer.
const toB64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

export function encodeShare(r: AtsResult, lang: Lang): string {
  const card: ShareCard = { s: r.score, g: r.grade, f: r.fixes.slice(0, 3).map((c) => c.id), k: r.keywords.coverage, l: lang };
  return toB64url(JSON.stringify(card));
}

export function decodeShare(token: string): ShareCard | null {
  try {
    const o = JSON.parse(fromB64url(token)) as Partial<ShareCard>;
    if (typeof o.s !== "number" || !["A", "B", "C", "D"].includes(String(o.g)) || !Array.isArray(o.f)) return null;
    const ids = o.f.filter((x): x is CheckId => typeof x === "string" && x in WEIGHTS).slice(0, 3);
    return { s: Math.max(0, Math.min(100, Math.round(o.s))), g: o.g as AtsResult["grade"], f: ids, k: typeof o.k === "number" ? o.k : null, l: (["en", "pt", "es"] as const).includes(o.l as Lang) ? (o.l as Lang) : "en" };
  } catch { return null; }
}
