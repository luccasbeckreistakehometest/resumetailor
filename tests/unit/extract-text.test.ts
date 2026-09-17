import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { describeExtraction, htmlToText, kindOf, normaliseExtractedText, pdfItemsToText, type PdfTextItem } from "@/lib/text/extract";

const item = (str: string, x: number, y: number, extra: Partial<PdfTextItem> = {}): PdfTextItem => ({ str, transform: [11, 0, 0, 11, x, y], hasEOL: false, width: str.length * 5, height: 11, ...extra });

describe("normalisation", () => {
  it("turns bullet glyphs into '- ', fixes ligatures and odd spaces, and collapses blank runs", () => {
    const raw = "Skills \n• HubSpot   · SQL\n▪ A/B testing\n Copywriting\n\n\n\nEﬃcient ﬁnance\n– dash bullet\n";
    expect(normaliseExtractedText(raw)).toBe("Skills\n- HubSpot · SQL\n- A/B testing\n- Copywriting\n\nEfficient finance\n- dash bullet");
  });
  it("attaches a bullet that landed alone on its own line to the text that follows", () => {
    expect(normaliseExtractedText("•\nGrew pipeline 38%\n•\nLed a team")).toBe("- Grew pipeline 38%\n- Led a team");
  });
  it("keeps a lone dash inside prose", () => {
    expect(normaliseExtractedText("Growth Lead - Acme")).toBe("Growth Lead - Acme");
  });
});

describe("pdf items → lines", () => {
  it("joins runs on one baseline, breaks on a new baseline, and blank-lines a paragraph gap", () => {
    const page = [item("Alex", 72, 740), item("Ribeiro", 100, 740), item("Summary", 72, 700), item("Lead with 6 years", 72, 686, { hasEOL: true }), item("Experience", 72, 650)];
    expect(pdfItemsToText([page])).toBe("Alex Ribeiro\n\nSummary\nLead with 6 years\n\nExperience");
  });
  it("does not insert a space where runs touch, and separates pages", () => {
    const p1 = [item("Hub", 72, 740, { width: 15 }), item("Spot", 87, 740)];
    const p2 = [item("Page two", 72, 740)];
    expect(pdfItemsToText([p1, p2])).toBe("HubSpot\n\nPage two");
  });
});

describe("html → text", () => {
  it("keeps headings and bullets as Markdown and flattens tables", () => {
    const html = `<h1>Maria Souza</h1><p>maria@example.com &middot; Curitiba</p><h2>Experi&#234;ncia</h2><p>Analista &amp; mais</p><ul><li>Automatizei <strong>15</strong> relatórios</li><li>Reduzi o churn em 12%</li></ul><table><tr><td>SQL</td><td>Python</td></tr></table><p>fim<br/>linha</p>`;
    expect(htmlToText(html)).toBe("# Maria Souza\nmaria@example.com · Curitiba\n\n## Experiência\nAnalista & mais\n- Automatizei 15 relatórios\n- Reduzi o churn em 12%\nSQL · Python\nfim\nlinha");
  });
});

describe("file kinds and scans", () => {
  it("recognises pdf, docx and text by extension or mime and refuses the rest", () => {
    expect(kindOf("cv.PDF", "")).toBe("pdf");
    expect(kindOf("cv", "application/pdf")).toBe("pdf");
    expect(kindOf("cv.docx", "")).toBe("docx");
    expect(kindOf("notes.md", "")).toBe("txt");
    expect(kindOf("photo.png", "image/png")).toBeNull();
    expect(kindOf("cv.doc", "application/msword")).toBeNull();
  });
  it("calls a PDF with pages but no text a scan", () => {
    expect(describeExtraction("", "pdf", 2).scanned).toBe(true);
    expect(describeExtraction("Alex Ribeiro, growth lead with six years of results", "pdf", 1).scanned).toBe(false);
    expect(describeExtraction("", "docx", 1).scanned).toBe(false);
    expect(describeExtraction("one two three", "txt", 1).words).toBe(3);
  });
});

describe("real fixtures", () => {
  const fixture = (n: string) => fs.readFileSync(path.join(process.cwd(), "tests", "fixtures", n));

  // The PDF fixtures are exercised in the browser by the Playwright spec: pdf.js needs a DOM in Node.
  it("reads the DOCX fixture through mammoth with headings and bullets intact", async () => {
    const mammoth = await import("mammoth");
    const html = (await mammoth.convertToHtml({ buffer: fixture("sample-resume.docx") })).value;
    const text = htmlToText(html);
    expect(text).toContain("# Maria Souza");
    expect(text).toContain("## Experiência profissional");
    expect(text).toContain("- Automatizei 15 relatórios em Power BI");
    expect(text).toContain("Bacharelado em Estatística, UFPR, 2021");
  });

});
