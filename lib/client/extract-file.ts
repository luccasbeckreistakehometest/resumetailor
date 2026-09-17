"use client";

import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { IMPORT_MAX_BYTES, describeExtraction, htmlToText, kindOf, normaliseExtractedText, pdfItemsToText, type Extracted, type PdfTextItem } from "@/lib/text/extract";

/**
 * Reads a résumé file in the browser and returns its text. The file never leaves the device:
 * pdf.js and mammoth run locally (both loaded on first use, so the page stays light), and the
 * pdf.js worker is served from the app's own bundle — no CDN.
 */
export type ImportError = "unsupported" | "too_large" | "scanned" | "failed";
export class ImportFailure extends Error { constructor(public code: ImportError) { super(code); } }

let worker: Worker | null = null;

async function pdfText(buf: ArrayBuffer): Promise<{ text: string; pages: number }> {
  // The legacy build carries its own polyfills, so older phones read PDFs too; the worker is bundled from the package, not a CDN.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!worker) {
    worker = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    pdfjs.GlobalWorkerOptions.workerPort = worker;
  }
  // Hardened for untrusted files. GHSA-hq66-cqwq-w95j (pdfjs-dist < 6.2.108) needs the viewer's
  // scripting sandbox (enableScripting), which this text-only path never loads; `isEvalSupported`
  // no longer exists in 5.x (fonts are not compiled with eval any more). We never render, so no
  // font faces or XFA either. The move to pdfjs-dist 6 is a separate, breaking upgrade.
  const task = pdfjs.getDocument({ data: new Uint8Array(buf), enableXfa: false, disableFontFace: true, useSystemFonts: false });
  const doc = await task.promise;
  const pages: PdfTextItem[][] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.filter((i): i is TextItem => "str" in i);
      pages.push(items.map((i) => ({ str: i.str, transform: i.transform, hasEOL: i.hasEOL, width: i.width, height: i.height })));
    }
  } finally { await task.destroy().catch(() => {}); }
  return { text: pdfItemsToText(pages), pages: doc.numPages };
}

async function docxText(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const r = await mammoth.convertToHtml({ arrayBuffer: buf });
  return htmlToText(r.value);
}

export async function extractTextFromFile(file: File): Promise<Extracted> {
  const kind = kindOf(file.name, file.type);
  if (!kind) throw new ImportFailure("unsupported");
  if (file.size > IMPORT_MAX_BYTES) throw new ImportFailure("too_large");
  try {
    if (kind === "txt") return describeExtraction(normaliseExtractedText(await file.text()), kind, 1);
    const buf = await file.arrayBuffer();
    if (kind === "docx") return describeExtraction(await docxText(buf), kind, 1);
    const { text, pages } = await pdfText(buf);
    const result = describeExtraction(text, kind, pages);
    if (result.scanned) throw new ImportFailure("scanned");
    return result;
  } catch (e) {
    if (e instanceof ImportFailure) throw e;
    console.error("import", e);
    throw new ImportFailure("failed");
  }
}
