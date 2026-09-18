"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { extractTextFromFile, ImportFailure, type ImportError } from "@/lib/client/extract-file";
import type { Extracted } from "@/lib/text/extract";

type Status = { kind: "idle" } | { kind: "busy"; name: string } | { kind: "done"; name: string; words: number } | { kind: "error"; code: ImportError };

/**
 * Reads a PDF / DOCX / TXT in the browser and hands the text back. Two ways in: the dashed strip
 * (click or drop) and, through `useFileImport`, dropping straight onto a textarea. The file is
 * parsed locally and never uploaded — the status line says so.
 */
export function useFileImport(onText: (text: string, meta: Extracted & { name: string }) => void) {
  const { x } = useI18n();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [over, setOver] = useState(false);

  async function readFile(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "busy", name: file.name });
    try {
      const r = await extractTextFromFile(file);
      setStatus({ kind: "done", name: file.name, words: r.words });
      onText(r.text, { ...r, name: file.name });
    } catch (e) {
      setStatus({ kind: "error", code: e instanceof ImportFailure ? e.code : "failed" });
    }
  }
  const dragProps = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => { e.preventDefault(); setOver(false); void readFile(e.dataTransfer.files?.[0]); },
  };
  const message = status.kind === "busy" ? x.importer.reading(status.name)
    : status.kind === "done" ? x.importer.imported(status.words, status.name)
    : status.kind === "error" ? x.importer.errors[status.code] : "";
  return { status, over, dragProps, readFile, message };
}

export function ImportDrop({ onText, testId = "import", hint, className = "", tour }: {
  onText: (text: string, meta: Extracted & { name: string }) => void; testId?: string; hint?: ReactNode; className?: string; tour?: string;
}) {
  const { x } = useI18n();
  const imp = useFileImport(onText);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={className} data-tour={tour}>
      <div {...imp.dragProps} onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        className={"flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed px-4 py-3 text-sm transition " + (imp.over ? "border-ink bg-gold-2" : "border-edge-2 bg-paper hover:border-ink")}
        data-testid={`${testId}-drop`}>
        <span aria-hidden>📄</span>
        <span className="font-medium text-ink">{x.importer.drop}</span>
        <span className="font-medium text-[color:var(--ink)] underline underline-offset-[3px]">{x.importer.choose}</span>
        <span className="text-xs text-muted">{hint ?? x.importer.privacy}</span>
      </div>
      <input ref={input} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden"
        onChange={(e) => { void imp.readFile(e.target.files?.[0]); e.target.value = ""; }} data-testid={`${testId}-file`} aria-label={x.importer.choose} />
      {imp.message && (
        <p className={"mt-2 text-sm " + (imp.status.kind === "error" ? "text-oxblood" : imp.status.kind === "done" ? "text-moss" : "text-muted")} role={imp.status.kind === "error" ? "alert" : "status"} data-testid={`${testId}-status`} data-state={imp.status.kind}>
          {imp.status.kind === "done" && "✓ "}{imp.message}
        </p>
      )}
    </div>
  );
}

/** A résumé textarea that also accepts a dropped file; the import strip sits under it. */
export function ImportableTextarea({ value, onChange, rows = 11, placeholder, testId, importTestId = "import", tour, id, label, labelVisible = false }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; testId?: string; importTestId?: string; tour?: string;
  /** Every textarea gets an accessible name: a visible label, or a screen-reader-only one. */
  id?: string; label?: string; labelVisible?: boolean;
}) {
  const imp = useFileImport((text) => onChange(text));
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  return (
    <div>
      {label && <label htmlFor={fieldId} className={labelVisible ? "mb-1.5 block text-sm font-medium text-ink-2" : "sr-only"}>{label}</label>}
      <textarea id={fieldId} aria-label={label || id ? undefined : placeholder} className={"field " + (imp.over ? "!border-ink !bg-gold-2" : "")} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testId} {...imp.dragProps} />
      <ImportDrop onText={(text) => onChange(text)} testId={importTestId} className="mt-2" tour={tour} />
    </div>
  );
}
