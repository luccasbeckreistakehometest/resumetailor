"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { GenerationView } from "@/lib/server/generations";
import { fileBase } from "@/lib/resume/export";

type Template = "ats" | "modern" | "elegant" | "compact" | "bold";
const TEMPLATES: Template[] = ["ats", "modern", "elegant", "compact", "bold"];

function PrintInner() {
  const params = useSearchParams();
  const { d, x } = useI18n();
  const [tpl, setTpl] = useState<Template>((TEMPLATES.includes(params.get("template") as Template) ? params.get("template") : "modern") as Template);
  const [gen, setGen] = useState<GenerationView | null | undefined>(undefined);

  useEffect(() => {
    const id = params.get("id") ?? localStorage.getItem("rt_last_gen");
    const load = id ? fetch(`/api/generations/${id}`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null);
    void load.then(setGen);
  }, [params]);

  // "Save as PDF" suggests the page title as the file name: make it the candidate and the role.
  useEffect(() => {
    if (!gen?.kit) return;
    const lang = (["en", "pt", "es"].includes(gen.lang) ? gen.lang : "en") as "en" | "pt" | "es";
    document.title = fileBase("resume", lang, gen.title, gen.targetRole);
  }, [gen]);

  if (gen === undefined) return null;
  if (!gen || !gen.kit) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="font-display mt-4 text-2xl text-ink">{d.paywall.title}</h1>
        <p className="mt-2 text-sm text-ink-2">{d.paywall.body}</p>
        <Link href={gen ? `/start?gen=${gen.id}` : "/start"} className="btn btn-primary mt-6">{gen ? x.credits.unlockWith : d.paywall.cta}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-2">
      <div className="no-print sticky top-0 z-10 border-b border-edge bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink-2">{d.print.format}:</span>
            {TEMPLATES.map((t) => (
              <button key={t} onClick={() => setTpl(t)} title={d.print.hint[t]} className={"rounded-full border px-3 py-1.5 text-sm font-medium transition " + (tpl === t ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2 hover:border-ink")}>{d.print.templates[t]}</button>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn btn-primary !py-2 !text-sm" data-testid="print">{d.print.save}</button>
        </div>
        <p className="mx-auto mt-1.5 max-w-5xl text-xs text-muted">{d.print.hint[tpl]} · {d.print.tip}</p>
      </div>
      <div className="mx-auto my-6 w-full max-w-[210mm] bg-white p-6 shadow-lg sm:p-[16mm] print:my-0 print:max-w-none print:p-0 print:shadow-none" data-testid="document">
        <div className={`doc-${tpl}`}><ReactMarkdown>{gen.kit.resume}</ReactMarkdown></div>
      </div>
    </div>
  );
}

export default function PrintPage() { return <Suspense fallback={null}><PrintInner /></Suspense>; }
