/**
 * The résumé Markdown the kit produces, split into editable parts and put back together without
 * losing anything: every entry header keeps its own layout as a template, so an untouched résumé
 * serialises to the same text (up to blank-line normalisation). Deterministic, no AI.
 */
export type SectionKind = "summary" | "experience" | "education" | "skills" | "languages" | "other";
export interface Item { kind: "bullet" | "text"; text: string; marker: string }
export interface Entry { title: string; org: string; dates: string; template: string; items: Item[] }
export interface Section { heading: string; level: string; kind: SectionKind; intro: string; entries: Entry[] | null; text: string }
export interface ParsedResume { name: string; nameTemplate: string; contact: string; sections: Section[] }

const T = "\u0001T\u0001", O = "\u0001O\u0001", D = "\u0001D\u0001";

const KIND_WORDS: [SectionKind, RegExp][] = [
  ["summary", /^(summary|professional summary|profile|about( me)?|objective|resumo( profissional)?|perfil( profissional)?|sobre( mim)?|objetivo|resumen( profesional)?|perfil profesional|acerca de m[ií])\b/i],
  ["experience", /^(experience|work experience|professional experience|employment( history)?|work history|experi[êe]ncias?( profissional| profissionais| laboral| profesional)?|hist[óo]rico profissional|trajet[óo]ria)\b/i],
  ["education", /^(education|academic background|forma[çc][ãa]o( acad[êe]mica)?|educa[çc][ãa]o|educaci[óo]n|formaci[óo]n( acad[ée]mica)?|estudos|estudios)\b/i],
  ["skills", /^(skills|core skills|key skills|technical skills|competencies|compet[êe]ncias|habilidades|competencias|conhecimentos|conocimientos|tools|ferramentas|herramientas)\b/i],
  ["languages", /^(languages|idiomas|l[íi]nguas|lenguas)\b/i],
];
export const kindOf = (heading: string): SectionKind => KIND_WORDS.find(([, re]) => re.test(heading.replace(/[*_#:]/g, "").trim()))?.[0] ?? "other";

const BULLET = /^(\s*[-*•]\s+)(.*)$/;
const MONTH = "(?:\\b(?:jan(?:uary|eiro)?|ene(?:ro)?|feb(?:ruary|rero)?|fev(?:ereiro)?|mar(?:ch|ço|zo)?|apr(?:il)?|abr(?:il)?|may(?:o)?|mai(?:o)?|jun(?:e|ho|io)?|jul(?:y|ho|io)?|aug(?:ust)?|ago(?:sto)?|sep(?:t|tember|tiembre)?|set(?:embro|iembre)?|oct(?:ober|ubre)?|out(?:ubro)?|nov(?:ember|embro|iembre)?|dec(?:ember)?|dez(?:embro)?|dic(?:iembre)?)\\.?\\s*(?:de\\s+)?|\\b\\d{1,2}/)";
const YEAR = "(?:19|20)\\d{2}";
const OPEN_END = "(?:presente|present|current|now|today|atualmente|atual|hoje|actualidad|actual|hoy|em andamento|cursando)\\b";
const DATES = new RegExp(`(${MONTH}?${YEAR}\\s*(?:[–—-]|to|a|até|hasta)\\s*(?:${MONTH}?${YEAR}|${OPEN_END})|${MONTH}?${YEAR})`, "i");
const SEPARATORS = [" — ", " – ", " | ", " · ", " @ ", " at ", " na ", " no ", " en ", ", ", " - "];

/** Splits an entry header ("**Growth Lead — Acme** (2021–2026)") into parts plus a template to rebuild it. */
export function parseEntryHeader(raw: string): Pick<Entry, "title" | "org" | "dates" | "template"> {
  let template = raw;
  let dates = "";
  const dm = raw.match(DATES);
  if (dm && dm.index !== undefined) {
    dates = dm[1];
    template = raw.slice(0, dm.index) + D + raw.slice(dm.index + dm[1].length);
  }
  // The text left for title and org: strip heading marks, bold, brackets and separators around the dates.
  const body = template.replace(D, "").replace(/^#+\s*/, "").replace(/\*\*|__/g, "").replace(/[()[\]]/g, " ").replace(/\s[|·—–-]\s*$/, "").trim();
  let title = body.replace(/[\s|·—–,-]+$/, "").trim();
  let org = "";
  for (const sep of SEPARATORS) {
    const i = title.indexOf(sep);
    if (i > 0) { org = title.slice(i + sep.length).trim(); title = title.slice(0, i).trim(); break; }
  }
  org = org.replace(/[\s|·—–,-]+$/, "").trim();
  const place = (tpl: string, value: string, mark: string) => {
    if (!value) return tpl;
    const at = tpl.indexOf(value);
    return at < 0 ? tpl : tpl.slice(0, at) + mark + tpl.slice(at + value.length);
  };
  template = place(template, title, T);
  if (!template.includes(T)) return { title: raw, org: "", dates: "", template: T };
  const afterTitle = template.indexOf(T) + T.length;
  const orgAt = org ? template.indexOf(org, afterTitle) : -1;
  if (org && orgAt >= 0) template = template.slice(0, orgAt) + O + template.slice(orgAt + org.length);
  else org = "";
  return { title, org, dates, template };
}

export const renderEntryHeader = (e: Pick<Entry, "title" | "org" | "dates" | "template">) => {
  let tpl = e.template;
  // A part the person cleared takes its separator (and brackets) with it.
  if (!e.org) tpl = tpl.replace(/\s*(?:—|–|\||·|@|,|-)\s*\u0001O\u0001/, "").replace(O, "");
  if (!e.dates) tpl = tpl.replace(/\s*(?:—|–|\||·|,|-)?\s*[([]?\u0001D\u0001[)\]]?/, "").replace(D, "");
  return tpl.split(T).join(e.title).split(O).join(e.org).split(D).join(e.dates).trimEnd();
};

const isHeaderLine = (line: string, prevWasBullet: boolean) =>
  /^#{3,6}\s/.test(line) || /^\*\*[^*]+\*\*/.test(line) || /^__[^_]+__/.test(line) || DATES.test(line) || prevWasBullet;

function parseEntries(lines: string[]): { intro: string; entries: Entry[] } {
  const intro: string[] = [];
  const entries: Entry[] = [];
  let prevBullet = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    const b = line.match(BULLET);
    const current = entries[entries.length - 1];
    if (b) {
      if (current) current.items.push({ kind: "bullet", text: b[2], marker: b[1] });
      else intro.push(line);
      prevBullet = true;
      continue;
    }
    if (!current || isHeaderLine(line, prevBullet)) entries.push({ ...parseEntryHeader(line), items: [] });
    else current.items.push({ kind: "text", text: line, marker: "" });
    prevBullet = false;
  }
  return { intro: intro.join("\n"), entries };
}

/** Null when the text has no section headings we can work with (the editor then offers a plain text box). */
export function parseResume(md: string): ParsedResume | null {
  const lines = md.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  const level = lines.some((l) => /^##\s/.test(l)) ? "##" : lines.filter((l) => /^###\s/.test(l)).length >= 2 ? "###" : null;
  if (!level) return null;
  const isSection = (l: string) => l.startsWith(level + " ") && !l.startsWith(level + "#");
  const first = lines.findIndex(isSection);
  const head = lines.slice(0, first).filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim()));
  const nameIdx = head.findIndex((l) => l.trim());
  const nameLine = nameIdx >= 0 ? head[nameIdx] : "";
  const name = nameLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  const nameTemplate = name ? nameLine.replace(name, T) : T;
  const contact = head.slice(nameIdx + 1).join("\n").trim();
  const sections: Section[] = [];
  let i = first;
  while (i < lines.length) {
    const heading = lines[i].slice(level.length + 1).trim();
    let j = i + 1;
    while (j < lines.length && !isSection(lines[j])) j++;
    const body = lines.slice(i + 1, j);
    const kind = kindOf(heading);
    if (kind === "experience" || kind === "education") {
      const { intro, entries } = parseEntries(body);
      sections.push({ heading, level, kind, intro, entries: entries.length ? entries : null, text: entries.length ? "" : body.join("\n").trim() });
    } else {
      sections.push({ heading, level, kind, intro: "", entries: null, text: body.join("\n").trim() });
    }
    i = j;
  }
  return { name, nameTemplate, contact, sections };
}

export function serialiseResume(p: ParsedResume): string {
  const out: string[] = [];
  if (p.name || p.nameTemplate !== T) out.push(p.nameTemplate.split(T).join(p.name));
  if (p.contact) out.push(p.contact);
  const blocks = [out.join("\n")];
  for (const s of p.sections) {
    const parts: string[] = [`${s.level} ${s.heading}`];
    if (s.entries) {
      if (s.intro) parts.push(s.intro);
      const ents = s.entries.map((e) => [renderEntryHeader(e), ...e.items.filter((it) => it.text.trim()).map((it) => (it.kind === "bullet" ? `${it.marker || "- "}${it.text}` : it.text))].join("\n"));
      parts.push(ents.join("\n\n"));
    } else if (s.text) parts.push(s.text);
    blocks.push(parts.join("\n"));
  }
  return blocks.filter(Boolean).join("\n\n") + "\n";
}

/** Blank lines and trailing spaces do not count as a change. */
export const normaliseMd = (md: string) => md.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();

/** A new, empty entry that renders like the others in its section. */
export function blankEntry(like?: Entry): Entry {
  return { title: "", org: "", dates: "", template: like?.template ?? `**${T} — ${O}** (${D})`, items: [{ kind: "bullet", text: "", marker: like?.items.find((i) => i.kind === "bullet")?.marker ?? "- " }] };
}

/** Skills written as "A · B · C", "A, B" or a bullet list, as a plain list. */
export const listItems = (text: string) =>
  text.split(/\n|·|\||•|,|;/).map((s) => s.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "").trim()).filter(Boolean);

/** "2021–2026" → ["2021", "2026"]; "Jan 2024 – Present" → ["Jan 2024", "Present"]. */
export function splitDates(dates: string): [string, string] {
  const m = dates.split(/\s*(?:[–—]|\s-\s|-(?=\d)|\bto\b|\baté\b|\bhasta\b|\ba\b)\s*/i);
  return [m[0]?.trim() ?? "", m.slice(1).join(" ").trim()];
}

/** Markdown inline marks off, for plain-text fields. */
export const plain = (s: string) => s.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
