import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from "docx";

/**
 * Word and plain-text exports of a kit's documents. Single column, real headings and real bullet
 * lists, no tables or images — what applicant tracking systems parse best. Built in memory.
 *
 * THE ONE PLACE THE TYPE SYSTEM DOES NOT APPLY, deliberately (docs/DESIGN.md §14, surface 3).
 * On screen and on paper this product sets Source Serif 4 and Public Sans; a .docx cannot carry
 * them, and a font the reader's Word does not have is SUBSTITUTED, which reflows the page — the
 * one thing a résumé must never do. The design spec proposed Cambria for the body; I did not adopt
 * it, because Cambria ships with Office but not with Google Docs, where a great many of these
 * files are opened, and I could not verify the substitution behaviour from here. Calibri is what
 * every target has. Do not "fix" this to match the screen without opening the result in a real
 * Word and a real Google Docs first.
 */
export type ExportDoc = "resume" | "cover";
export type ExportLang = "en" | "pt" | "es";

const PREFIX: Record<ExportDoc, Record<ExportLang, string>> = {
  resume: { en: "Resume", pt: "Curriculo", es: "CV" },
  cover: { en: "Cover-letter", pt: "Carta", es: "Carta" },
};

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** "Curriculo-Alex-Ribeiro-Growth-Lead" — used for the download and for the printed PDF's title. */
export function fileBase(doc: ExportDoc, lang: ExportLang, name: string, role: string): string {
  return [PREFIX[doc][lang], slug(name), slug(role)].filter(Boolean).join("-") || PREFIX[doc][lang];
}

/** Bold (**x**) runs inside a line. */
function runs(line: string, base: { size?: number; bold?: boolean } = {}): TextRun[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) => {
    const bold = p.startsWith("**") && p.endsWith("**");
    const text = (bold ? p.slice(2, -2) : p).replace(/__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    return new TextRun({ text, bold: base.bold || bold, size: base.size, font: "Calibri" });
  });
}

/** Markdown (the kit's résumé) or plain text (the letter) to Word paragraphs. */
export function toParagraphs(text: string, doc: ExportDoc): Paragraph[] {
  const out: Paragraph[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { if (doc === "cover") out.push(new Paragraph({ children: [] })); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (h && h[1].length === 1) out.push(new Paragraph({ heading: HeadingLevel.TITLE, children: runs(h[2], { size: 32, bold: true }), spacing: { after: 60 } }));
    else if (h && h[1].length === 2) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(h[2].toUpperCase(), { size: 24, bold: true }), spacing: { before: 240, after: 80 } }));
    else if (h) out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(h[2], { size: 22, bold: true }), spacing: { before: 120, after: 40 } }));
    else if (b) out.push(new Paragraph({ numbering: { reference: "rt-bullets", level: 0 }, children: runs(b[1], { size: 21 }), spacing: { after: 30 } }));
    else out.push(new Paragraph({ children: runs(line, { size: 21 }), spacing: { after: doc === "cover" ? 0 : 60 } }));
  }
  return out;
}

export async function buildDocx(text: string, doc: ExportDoc, title: string): Promise<Buffer> {
  const document = new Document({
    title, creator: "ResumeTailor",
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    numbering: { config: [{ reference: "rt-bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: toParagraphs(text, doc) }],
  });
  return Packer.toBuffer(document);
}

/** Plain text for pasting into forms: headings in capitals, bullets as "• ", no Markdown marks. */
export function toPlainText(text: string): string {
  return text.replace(/\r\n?/g, "\n").split("\n").map((raw) => {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const clean = (s: string) => s.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    if (h) return h[1].length === 2 ? `\n${clean(h[2]).toUpperCase()}` : clean(h[2]);
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    return b ? `• ${clean(b[1])}` : clean(line);
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
