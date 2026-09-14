"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isPaid } from "@/lib/library";

type Result = { resume: string; coverLetter: string; linkedinAbout?: string };
type Template = "ats" | "modern" | "elegant" | "compact" | "bold";
const TEMPLATES: Template[] = ["ats", "modern", "elegant", "compact", "bold"];

function normalize(v: string | null): Template {
  if (v === "designed") return "modern";
  return (TEMPLATES.includes(v as Template) ? v : "modern") as Template;
}

function PrintInner() {
  const params = useSearchParams();
  const { d } = useI18n();
  const [tpl, setTpl] = useState<Template>(normalize(params.get("template") || params.get("theme")));
  const [result, setResult] = useState<Result | null>(null);
  const [paid, setPaid] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rt_result");
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {}
    }
    setPaid(isPaid());
    setLoaded(true);
  }, []);

  if (loaded && !paid) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{d.paywall.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{d.paywall.body}</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          {d.paywall.cta}
        </Link>
      </div>
    );
  }

  if (loaded && !result) {
    return <div className="p-12 text-center text-slate-500">No document found in this browser. Generate your resume first.</div>;
  }
  if (!result) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">{d.print.format}:</span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTpl(t)}
                  title={d.print.hint[t]}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition " +
                    (tpl === t ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300")
                  }
                >
                  {d.print.templates[t]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
            {d.print.save}
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-5xl text-xs text-slate-400">{d.print.hint[tpl]} · {d.print.tip}</p>
      </div>

      <div className="mx-auto my-6 w-full max-w-[210mm] bg-white p-6 shadow-lg sm:p-[16mm] print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <div className={`doc-${tpl}`}>
          <ReactMarkdown>{result.resume}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintInner />
    </Suspense>
  );
}
