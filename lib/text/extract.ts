import { wordCount } from "@/lib/ats/check";

/**
 * Turning a résumé file into the plain text the rest of the product works on. Everything here
 * is pure so it can be unit-tested; the browser-only parts (pdf.js, mammoth) live in
 * lib/client/extract-file.ts and feed these functions.
 *
 * The goal is not fidelity, it is a paste that a parser — and the ATS check — reads the way a
 * person would: one column, headings kept, bullets as "- ", no ligatures or private-use glyphs.
 */
export type ImportKind = "pdf" | "docx" | "txt";

/** One positioned run of text from pdf.js: what `getTextContent()` returns per item. */
export interface PdfTextItem { str: string; transform: number[]; hasEOL: boolean; width?: number; height?: number }

const LIGATURES: Record<string, string> = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "ft", "ﬆ": "st" };
// Bullet glyphs Word and designers use; U+F0B7 / U+F0A7 are Wingdings/Symbol bullets that survive a PDF export as private-use characters.
const BULLET_GLYPH = "•▪▫◦●○►➤➢✓✔■□❖➔→·";
const BULLET_START = new RegExp(`^[ \\t]*(?:[${BULLET_GLYPH}]|[\\u2013\\u2014](?=\\s))[ \\t]*`);
const LONE_BULLET = new RegExp(`^(?:-|[${BULLET_GLYPH}])$`);

/** Cleans text that came out of a PDF or a DOCX so it reads like a careful paste. */
export function normaliseExtractedText(raw: string): string {
  let t = raw.replace(/\r\n?/g, "\n").replace(/ /g, " ").replace(/­/g, "");
  t = t.replace(/[ﬀ-ﬆ]/g, (c) => LIGATURES[c] ?? c);
  const lines = t.split("\n").map((l) => l.replace(/[ \t]+$/g, "").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/, ""));
  const out: (string | null)[] = lines.map((l) => (BULLET_START.test(l) && l.replace(BULLET_START, "").trim() ? `- ${l.replace(BULLET_START, "").trim()}` : l));
  // a bullet glyph alone on a line (the PDF put the text in the next run) attaches to the line that follows
  for (let i = 0; i < out.length - 1; i++) {
    const cur = out[i];
    if (cur !== null && LONE_BULLET.test(cur)) { out[i + 1] = `- ${(out[i + 1] ?? "").replace(/^-\s*/, "")}`; out[i] = null; }
  }
  return out.filter((l): l is string => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Rebuilds lines from pdf.js text items. Items arrive in content order; a new line starts when
 * pdf.js says so (`hasEOL`) or when the baseline moves, and a paragraph break when it moves by
 * more than a line. Runs on the same baseline are joined with a space when there is a gap.
 */
export function pdfItemsToText(pages: PdfTextItem[][]): string {
  const chunks: string[] = [];
  for (const items of pages) {
    let lastY: number | null = null, lastEnd: number | null = null, lastH = 10, line = "";
    const flush = () => { if (line.trim()) chunks.push(line.trimEnd()); line = ""; };
    for (const it of items) {
      const x = it.transform[4] ?? 0, y = it.transform[5] ?? 0;
      const h = Math.abs(it.transform[3] || it.height || lastH) || 10;
      if (lastY !== null && Math.abs(y - lastY) > h * 0.45) {
        flush();
        if (lastY - y > h * 1.7) chunks.push("");
      } else if (lastEnd !== null && x - lastEnd > h * 0.25 && line && !line.endsWith(" ") && !it.str.startsWith(" ")) line += " ";
      line += it.str;
      lastY = y; lastH = h; lastEnd = x + (it.width ?? 0);
      if (it.hasEOL) { flush(); lastEnd = null; }
    }
    flush();
    chunks.push("");
  }
  return normaliseExtractedText(chunks.join("\n"));
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", bull: "•", ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™",
};
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENTITIES[e.toLowerCase()] ?? m;
});

/**
 * The HTML mammoth produces from a DOCX is small and regular (p, h1–h6, ul/ol/li, table, br,
 * inline marks). Headings become Markdown headings and list items bullets, which is exactly what
 * the kit's own résumés look like. Regex-based on purpose: no DOM needed, so it runs in tests.
 */
export function htmlToText(html: string): string {
  let t = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  // a blank line before a heading, the next line straight under it — the shape the kit's own résumés use
  t = t.replace(/<h1[^>]*>/gi, "\n\n# ").replace(/<h[23][^>]*>/gi, "\n\n## ").replace(/<h[4-6][^>]*>/gi, "\n\n### ");
  t = t.replace(/<\/h[1-6]>/gi, "\n");
  // block closers end a line; openers add nothing, so lists and tables sit flush under the paragraph before them
  t = t.replace(/<li[^>]*>/gi, "- ").replace(/<\/li>/gi, "\n");
  t = t.replace(/<\/?(?:ul|ol)[^>]*>/gi, "");
  t = t.replace(/<\/(?:td|th)>\s*<(?:td|th)[^>]*>/gi, " · ").replace(/<\/tr>/gi, "\n").replace(/<\/?(?:table|tbody|thead|tr|td|th)[^>]*>/gi, "");
  t = t.replace(/<\/p>/gi, "\n").replace(/<\/div>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  return normaliseExtractedText(decode(t));
}

export interface Extracted { text: string; words: number; kind: ImportKind; pages: number; scanned: boolean }

/** A PDF whose pages yielded (almost) no text has no text layer: it is a scan, and needs OCR we do not do. */
export function describeExtraction(text: string, kind: ImportKind, pages: number): Extracted {
  const words = wordCount(text);
  const scanned = kind === "pdf" && pages > 0 && text.replace(/\s/g, "").length < 40;
  return { text, words, kind, pages, scanned };
}

export function kindOf(name: string, mime: string): ImportKind | null {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (ext === "txt" || ext === "md" || mime.startsWith("text/")) return "txt";
  return null;
}

/** 15 MB is far beyond any real résumé; larger files are almost always the wrong file. */
export const IMPORT_MAX_BYTES = 15 * 1024 * 1024;
