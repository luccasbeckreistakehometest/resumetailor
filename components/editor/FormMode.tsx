"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { formFields, formFieldsText } from "@/lib/resume/formFields";

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

type Labels = { copy: string; copied: string; empty: string; chars: (n: number) => string };
function Field({ id, label, value, multi, copied, onCopy, F }: { id: string; label: string; value: string; multi?: boolean; copied: string | null; onCopy: (key: string, text: string) => void; F: Labels }) {
  return (
    <div className="rounded-xl border border-edge bg-paper p-3" data-testid={`form-${id}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {value ? (
          <button type="button" onClick={() => onCopy(id, value)} className="rounded-full border border-edge-2 px-3 py-1 text-xs font-semibold text-ink hover:border-ink" data-testid={`copy-${id}`}>{copied === id ? `✓ ${F.copied}` : F.copy}</button>
        ) : <span className="text-xs text-muted">{F.empty}</span>}
      </div>
      {value && <p className={"mt-1.5 text-sm text-ink " + (multi ? "whitespace-pre-line" : "")} data-testid={`value-${id}`}>{value}</p>}
      {value && multi && <p className="mt-1 text-[11px] text-muted">{F.chars(value.length)}</p>}
    </div>
  );
}

/** "Colar no formulário": one block per field an application form asks for, each with a copy button. */
export function FormMode({ resume, cover }: { resume: string; cover: string }) {
  const { r } = useI18n();
  const F = r.editor.form;
  const f = formFields(resume, cover);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => { void copyText(text).then((ok) => { if (!ok) return; setCopied(key); window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500); }); };

  const all = formFieldsText(f, { summary: F.summary, experience: F.experience, education: F.education, languages: F.languages, skills: F.skills, cover: F.cover });
  return (
    <div className="space-y-4" data-testid="form-mode">
      <p className="text-sm text-ink-2">{F.intro}</p>
      <button type="button" onClick={() => copy("all", all)} className="btn btn-ink !py-2 !text-sm" data-testid="copy-all">{copied === "all" ? `✓ ${F.copied}` : F.copyAll}</button>
      <Field copied={copied} onCopy={copy} F={F} id="summary" label={F.summary} value={f.summary} multi />
      {f.experiences.map((e, i) => (
        <div key={i} className="card space-y-2 p-3" data-testid="form-experience">
          <p className="eyebrow">{F.experience} {i + 1}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field copied={copied} onCopy={copy} F={F} id={`exp${i}-title`} label={F.position} value={e.title} />
            <Field copied={copied} onCopy={copy} F={F} id={`exp${i}-company`} label={F.company} value={e.company} />
            <Field copied={copied} onCopy={copy} F={F} id={`exp${i}-start`} label={F.start} value={e.start} />
            <Field copied={copied} onCopy={copy} F={F} id={`exp${i}-end`} label={F.end} value={e.end} />
          </div>
          <Field copied={copied} onCopy={copy} F={F} id={`exp${i}-description`} label={F.description} value={e.description} multi />
        </div>
      ))}
      <Field copied={copied} onCopy={copy} F={F} id="education" label={F.education} value={f.education.join("\n")} multi />
      <Field copied={copied} onCopy={copy} F={F} id="languages" label={F.languages} value={f.languages} />
      <Field copied={copied} onCopy={copy} F={F} id="skills" label={F.skills} value={f.skills} />
      <Field copied={copied} onCopy={copy} F={F} id="cover" label={F.cover} value={f.cover} multi />
    </div>
  );
}
