"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { GenerationView } from "@/lib/server/generations";
import { fileBase } from "@/lib/resume/export";
import { Button, Chip, EmptyState } from "@/components/ui";

type Template = "ats" | "modern" | "elegant" | "compact" | "bold";
const TEMPLATES: Template[] = ["ats", "modern", "elegant", "compact", "bold"];

function PrintInner() {
  const params = useSearchParams();
  const { d, x } = useI18n();
  const [tpl, setTpl] = useState<Template>((TEMPLATES.includes(params.get("template") as Template) ? params.get("template") : "modern") as Template);
  const [gen, setGen] = useState<GenerationView | null | undefined>(undefined);
  // ?variant=intl:en prints the international version instead of the kit's own résumé.
  const variant = params.get("variant");
  const [variantText, setVariantText] = useState<string | null>(null);
  useEffect(() => {
    const id = params.get("id");
    const target = variant?.match(/^intl:(en|pt|es)$/)?.[1];
    if (!id || !target) return;
    let alive = true;
    fetch(`/api/generations/${id}/intl?target=${target}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive) setVariantText(j?.version?.resume ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [params, variant]);

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
      <div className="mx-auto max-w-[var(--measure)] px-[var(--s-5)] py-[var(--s-12)]">
        <EmptyState title={d.paywall.title} action={<Button href={gen ? `/start?gen=${gen.id}` : "/start"}>{gen ? x.credits.unlockWith : d.paywall.cta}</Button>}>
          {d.paywall.body}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)]">
      {/* The only chrome on this page, and it prints as nothing. */}
      <div className="no-print sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--raised)]">
        <div className="mx-auto flex max-w-[var(--page-max)] flex-wrap items-center justify-between gap-[var(--s-4)] px-[var(--s-5)] py-[var(--s-4)] sm:px-[var(--s-7)]">
          <div className="flex flex-wrap items-center gap-[var(--s-3)]">
            <span className="eyebrow">{d.print.format}</span>
            {TEMPLATES.map((t) => (
              <Chip key={t} selected={tpl === t} onClick={() => setTpl(t)}>{d.print.templates[t]}</Chip>
            ))}
          </div>
          <Button size="sm" icon="print" onClick={() => window.print()} data-testid="print">{d.print.save}</Button>
        </div>
        <p className="mx-auto max-w-[var(--page-max)] px-[var(--s-5)] pb-[var(--s-3)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)] sm:px-[var(--s-7)]">
          {d.print.hint[tpl]} · {d.print.tip}
        </p>
      </div>
      <div className="px-[var(--s-4)] py-[var(--s-8)] print:p-0">
        <div className="sheet mx-auto w-full max-w-[816px] p-[var(--s-7)] sm:p-[56px] print:max-w-none print:p-0" data-testid="document">
          <div className={`doc-${tpl}`}><ReactMarkdown>{variantText ?? gen.kit.resume}</ReactMarkdown></div>
        </div>
      </div>
    </div>
  );
}

export default function PrintPage() { return <Suspense fallback={null}><PrintInner /></Suspense>; }
