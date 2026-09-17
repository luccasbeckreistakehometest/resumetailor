"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Eyebrow } from "@/components/ui";
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
  const { d, r } = useI18n();
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
    if (res.ok) setNote(E.refreshed);
  }

  if (gen === undefined) return <div className="min-h-screen"><SiteHeader /></div>;
  if (!gen || !gen.kit) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <Container className="max-w-md py-20 text-center">
          <p className="text-4xl">🔒</p>
          <h1 className="font-display mt-3 text-2xl text-ink" data-testid="edit-locked">{E.lockedTitle}</h1>
          <Link href={gen ? `/start?gen=${gen.id}` : "/library"} className="btn btn-primary mt-6">{gen ? r.editor.back : d.nav.myCVs}</Link>
        </Container>
      </div>
    );
  }

  const exportHref = (doc: "resume" | "cover", format: "docx" | "txt") => `/api/generations/${id}/export?doc=${doc}&format=${format}`;
  const saveLabel = save === "saving" ? E.saving : save === "saved" ? `✓ ${E.saved}` : save === "failed" ? E.saveFailed : "";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>{gen.title}</Eyebrow>
            <h1 className="font-display mt-1 text-4xl text-ink">{E.title}</h1>
            <p className="mt-1 text-sm text-ink-2">{E.intro}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={"text-sm " + (save === "failed" ? "text-oxblood" : "text-muted")} role="status" data-testid="save-state">{saveLabel}</span>
            <Link href={`/start?gen=${id}`} className="btn btn-ghost !py-2 !text-sm">← {E.back}</Link>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-edge" role="tablist">
          {(["edit", "form", "changes"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
              className={"whitespace-nowrap px-3 py-2 text-sm font-medium " + (tab === t ? "border-b-2 border-ink text-ink" : "text-muted hover:text-ink")}>{E.tabs[t]}</button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {tab === "edit" && (parsed ? <ResumeEditor value={parsed} onChange={onParsed} /> : (
              <div className="card p-4">
                <p className="text-sm text-ink-2">{E.rawTitle}</p>
                <textarea aria-label={E.title} className="field mt-3 font-mono text-[13px]" rows={24} value={raw} onChange={(e) => onRaw(e.target.value)} data-testid="ed-raw" />
              </div>
            ))}
            {tab === "form" && <FormMode resume={raw} cover={gen.kit.coverLetter} />}
            {tab === "changes" && <KitChecks gen={gen} resume={raw} onReplace={onReplace} view="diff" />}
          </div>

          <aside className="min-w-0 space-y-4">
            <KitChecks gen={gen} resume={raw} onReplace={onReplace} view="truth" onEdit={() => setTab("edit")} onGen={setGen} />
            <div className="card p-4" data-testid="downloads">
              <p className="font-semibold text-ink">⬇ {E.download}</p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                {(["resume", "cover"] as const).map((doc) => (
                  <div key={doc} className="rounded-xl bg-paper p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{doc === "resume" ? E.resumeDoc : E.coverDoc}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <a href={exportHref(doc, "docx")} className="font-semibold text-oxblood" data-testid={`dl-${doc}-docx`}>{E.word}</a>
                      <a href={exportHref(doc, "txt")} className="font-semibold text-oxblood" data-testid={`dl-${doc}-txt`}>{E.txt}</a>
                      {doc === "resume" && <Link href={`/print?id=${id}&template=${tpl}`} target="_blank" className="font-semibold text-oxblood">{E.pdf}</Link>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <VersionsPanel genId={id} stamp={stamp} onRestored={onRestored} />
            {stamp > 0 && <button type="button" onClick={refreshLetters} className="text-sm font-medium text-oxblood underline-offset-4 hover:underline" data-testid="refresh-letters">↻ {E.refreshLetters}</button>}
            {note && <p className="text-sm text-moss" role="status">{note}</p>}
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-sm font-semibold text-ink">{E.preview}</span>
                {TEMPLATES.map((t) => (
                  <button key={t} type="button" onClick={() => setTpl(t)} className={"rounded-full border px-2.5 py-1 text-xs " + (tpl === t ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2")}>{d.print.templates[t]}</button>
                ))}
              </div>
              <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-lg bg-white p-5 shadow-inner" data-testid="edit-preview">
                <div className={`doc-${tpl}`}><ReactMarkdown>{raw}</ReactMarkdown></div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
