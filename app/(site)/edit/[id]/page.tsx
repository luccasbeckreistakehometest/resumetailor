"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, Chip, Container, EmptyState, Tabs, Textarea } from "@/components/ui";
import { ResumeEditor } from "@/components/editor/ResumeEditor";
import { FormMode } from "@/components/editor/FormMode";
import { VersionsPanel } from "@/components/editor/VersionsPanel";
import { KitChecks } from "@/components/editor/KitChecks";
import { parseResume, serialiseResume, type ParsedResume } from "@/lib/resume/sections";
import type { GenerationView } from "@/lib/server/generations";

type Template = "ats" | "modern" | "elegant" | "compact" | "bold";
const TEMPLATES: Template[] = ["modern", "ats", "elegant", "compact", "bold"];
type Tab = "edit" | "form" | "changes";

/** /edit/[id]: the unlocked kit's résumé, editable, with history, downloads and the form mode. */
export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const { d, r, l, x } = useI18n();
  const E = r.editor;
  const [gen, setGen] = useState<GenerationView | null | undefined>(undefined);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [raw, setRaw] = useState("");
  const [tab, setTab] = useState<Tab>("edit");
  const [tpl, setTpl] = useState<Template>("modern");
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [stamp, setStamp] = useState(0);
  const [note, setNote] = useState("");
  const timer = useRef<number | null>(null);

  const adopt = useCallback((g: GenerationView | null) => {
    setGen(g);
    if (g?.kit) { setRaw(g.kit.resume); setParsed(parseResume(g.kit.resume)); }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/generations/${id}`, { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).then((g) => { if (alive) adopt(g); }).catch(() => { if (alive) setGen(null); });
    const hash = window.location.hash.slice(1);
    if (hash === "changes" || hash === "form") { const t = window.setTimeout(() => setTab(hash), 0); return () => { alive = false; window.clearTimeout(t); }; }
    return () => { alive = false; };
  }, [id, adopt]);

  const persist = useCallback((text: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setSave("saving");
    timer.current = window.setTimeout(async () => {
      const res = await fetch(`/api/generations/${id}/resume`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: text }) }).catch(() => null);
      if (!res?.ok) { setSave("failed"); return; }
      const g = (await res.json()) as GenerationView;
      setGen(g); setSave("saved"); setStamp((n) => n + 1);
    }, 1500);
  }, [id]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const onParsed = (next: ParsedResume) => { setParsed(next); const text = serialiseResume(next); setRaw(text); persist(text); };
  const onRaw = (text: string) => { setRaw(text); persist(text); };
  const onRestored = (g: GenerationView) => { adopt(g); setStamp((n) => n + 1); };
  /** A line-level undo from "what changed" writes through the same save. */
  const onReplace = (text: string) => { setRaw(text); setParsed(parseResume(text)); persist(text); };

  async function refreshLetters() {
    const res = await fetch(`/api/generations/${id}/variants`, { method: "DELETE" });
    const j = (await res.json().catch(() => ({}))) as { removed?: number };
    setNote(res.ok ? (j.removed ? E.refreshed : E.upToDate) : apiErrorText(j, l, x.errors.generic));
  }

  if (gen === undefined) return <div className="min-h-screen"><SiteHeader /></div>;
  if (!gen || !gen.kit) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <Container className="py-[var(--s-12)]">
          <EmptyState
            title={E.lockedTitle}
            action={<Button href={gen ? `/start?gen=${gen.id}` : "/library"}>{gen ? r.editor.back : d.nav.myCVs}</Button>}
          >
            <span data-testid="edit-locked">{E.lockedTitle}</span>
          </EmptyState>
        </Container>
      </div>
    );
  }

  const exportHref = (doc: "resume" | "cover", format: "docx" | "txt") => `/api/generations/${id}/export?doc=${doc}&format=${format}`;
  const saveLabel = save === "saving" ? E.saving : save === "saved" ? E.saved : save === "failed" ? E.saveFailed : "";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-[var(--s-8)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--s-4)] border-b border-[var(--rule)] pb-[var(--s-4)]">
          <div>
            <p className="eyebrow">{gen.title}</p>
            <h1 className="doc-31 mt-[var(--s-2)] text-[color:var(--ink)]">{E.title}</h1>
            <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{E.intro}</p>
          </div>
          <div className="flex flex-wrap items-center gap-[var(--s-4)]">
            <span
              className="font-mono text-[length:var(--mn-13)] tabular-nums"
              style={{ color: save === "failed" ? "var(--mark)" : save === "saved" ? "var(--kept)" : "var(--ink-muted)" }}
              role="status"
              data-testid="save-state"
            >
              {saveLabel}
            </span>
            <Button variant="outline" size="sm" icon="arrow-left" href={`/start?gen=${id}`}>{E.back}</Button>
          </div>
        </div>

        {/* 7 / 5: the text being edited, and the page it becomes. */}
        <div className="mt-[var(--s-7)] grid gap-[var(--gutter)] lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <Tabs
              tabs={(["edit", "form", "changes"] as Tab[]).map((t) => ({ id: t, label: E.tabs[t], testId: `tab-${t}` }))}
              value={tab}
              onChange={(t) => setTab(t as Tab)}
            />
            <div className="mt-[var(--s-6)]">
              {tab === "edit" && (parsed ? <ResumeEditor value={parsed} onChange={onParsed} /> : (
                <div className="border border-[var(--rule)] p-[var(--s-5)]">
                  <p className="eyebrow">{E.rawTitle}</p>
                  <Textarea aria-label={E.title} className="mt-[var(--s-4)] font-mono text-[length:var(--mn-13)]" rows={24} value={raw} onChange={(e) => onRaw(e.target.value)} data-testid="ed-raw" />
                </div>
              ))}
              {tab === "form" && <FormMode resume={raw} cover={gen.kit.coverLetter} />}
              {tab === "changes" && <KitChecks gen={gen} resume={raw} onReplace={onReplace} view="diff" />}
            </div>
          </div>

          <aside className="min-w-0 lg:col-span-5" data-density="compact">
            {/* The document itself, on the sheet, in the same styles /print and /cv use. */}
            <div className="flex flex-wrap items-center gap-[var(--s-2)]">
              <span className="eyebrow mr-[var(--s-2)]">{E.preview}</span>
              {TEMPLATES.map((t) => (
                <Chip key={t} selected={tpl === t} onClick={() => setTpl(t)}>{d.print.templates[t]}</Chip>
              ))}
            </div>
            <div className="mt-[var(--s-4)] max-h-[70vh] overflow-y-auto">
              <div className="sheet p-[var(--s-7)]" data-testid="edit-preview">
                <div className={`doc-${tpl}`}><ReactMarkdown>{raw}</ReactMarkdown></div>
              </div>
            </div>

            <section className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="downloads">
              <p className="eyebrow">{E.download}</p>
              <div className="mt-[var(--s-4)] grid gap-[var(--s-5)] sm:grid-cols-2">
                {(["resume", "cover"] as const).map((doc) => (
                  <div key={doc}>
                    <p className="font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-2)]">{doc === "resume" ? E.resumeDoc : E.coverDoc}</p>
                    <div className="mt-[var(--s-2)] flex flex-wrap gap-x-[var(--s-4)] gap-y-[var(--s-2)] font-sans text-[length:var(--ui-13)] font-medium">
                      <a href={exportHref(doc, "docx")} className="text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid={`dl-${doc}-docx`}>{E.word}</a>
                      <a href={exportHref(doc, "txt")} className="text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid={`dl-${doc}-txt`}>{E.txt}</a>
                      {doc === "resume" && <Link href={`/print?id=${id}&template=${tpl}`} target="_blank" className="text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{E.pdf}</Link>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-[var(--s-8)]"><VersionsPanel genId={id} stamp={stamp} onRestored={onRestored} /></div>
            {stamp > 0 && (
              <Button variant="quiet" size="sm" icon="history" className="mt-[var(--s-4)]" onClick={refreshLetters} data-testid="refresh-letters">{E.refreshLetters}</Button>
            )}
            {note && <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--kept)]" role="status">{note}</p>}

            <div className="mt-[var(--s-8)]">
              <KitChecks gen={gen} resume={raw} onReplace={onReplace} view="truth" onEdit={() => setTab("edit")} onGen={setGen} />
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
