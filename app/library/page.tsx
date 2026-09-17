"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";
import type { GenerationView } from "@/lib/server/generations";
import type { SessionView } from "@/lib/server/interviews";

export default function LibraryPage() {
  const { d, x, lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<GenerationView[] | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [editId, setEditId] = useState<string | null>(null); const [draft, setDraft] = useState("");

  const load = () => Promise.all([
    fetch("/api/generations", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items ?? [])),
    fetch("/api/interview", { cache: "no-store" }).then((r) => r.json()).then((j) => setSessions(j.items ?? [])).catch(() => {}),
  ]);
  useEffect(() => { void load(); }, [user?.id]);
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang);

  async function rename(id: string) {
    if (draft.trim()) await fetch(`/api/generations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.trim() }) });
    setEditId(null); void load();
  }
  async function remove(id: string) { await fetch(`/api/generations/${id}`, { method: "DELETE" }); void load(); }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-4xl py-12">
        <Eyebrow>ResumeTailor</Eyebrow>
        <h1 className="font-display mt-2 text-4xl text-ink" data-tour="nav-library">{d.library.title}</h1>
        <p className="mt-2 text-ink-2">{user ? x.auth.title : x.credits.firstFree}</p>

        {items && items.length === 0 && (
          <div className="card mt-10 p-10 text-center"><p className="text-ink-2">{x.library.empty}</p><Link href="/start" className="btn btn-primary mt-6">{d.library.emptyCta}</Link></div>
        )}
        <ul className="mt-8 space-y-3" data-testid="library-list">
          {items?.map((g) => (
            <li key={g.id} className="card flex flex-wrap items-center gap-4 p-5" data-testid="library-item">
              <div className="min-w-0 flex-1">
                {editId === g.id ? (
                  <div className="flex gap-2">
                    <input className="field !py-1.5" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                    <button onClick={() => rename(g.id)} className="btn btn-ink !py-1.5 !text-sm">{d.library.save}</button>
                    <button onClick={() => setEditId(null)} className="btn btn-ghost !py-1.5 !text-sm">{d.library.cancel}</button>
                  </div>
                ) : (
                  <p className="truncate font-semibold text-ink">{g.title}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {new Date(g.createdAt).toLocaleDateString(lang === "pt" ? "pt-BR" : lang)} · {d.quiz.intent[g.mode as "tailor"].t}{g.source === "voice" ? ` · 🎙 ${x.library.voice}` : ""} · <span className="text-moss">{g.matchAfter}% {d.library.matchLabel}</span> · {g.unlocked ? <span className="text-moss">{x.library.unlocked}</span> : <span>{x.library.locked}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/start?gen=${g.id}`} className="btn btn-ghost !py-1.5 !text-sm">{x.library.open}</Link>
                <Link href={`/interview/${g.id}`} className="btn btn-ghost !py-1.5 !text-sm" data-testid="library-practice">🎙 {x.interview.practice}</Link>
                {g.unlocked && <Link href={`/print?id=${g.id}`} target="_blank" className="btn btn-ink !py-1.5 !text-sm">{x.library.print}</Link>}
                <button onClick={() => { setEditId(g.id); setDraft(g.title); }} className="text-sm text-muted hover:text-ink">{d.library.rename}</button>
                <button onClick={() => remove(g.id)} className="text-sm text-muted hover:text-oxblood">{d.library.delete}</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Practice sessions: always shown, so the tour can point at it before the first kit exists. */}
        <section className="mt-14" data-tour="interview" data-testid="library-sessions">
          <Eyebrow>{x.interview.eyebrow}</Eyebrow>
          <h2 className="font-display mt-1 text-3xl text-ink">{x.interview.sessionsTitle}</h2>
          <p className="mt-2 text-sm text-ink-2">{x.interview.sessionsIntro}</p>
          {sessions.length === 0 ? (
            <p className="card mt-5 p-6 text-sm text-muted">{x.interview.sessionsEmpty}</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="card flex flex-wrap items-center gap-4 p-4" data-testid="session-item">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{s.kitTitle}{s.targetRole ? ` · ${s.targetRole}` : ""}</p>
                    <p className="mt-1 text-xs text-muted">
                      {dateOf(s.createdAt)} · {s.mode === "preview" ? x.interview.preview : x.interview.fullBadge(s.questions.length)} · {x.interview.answered(s.aggregate.answered, s.questions.length)} · {s.status === "done" ? <span className="text-moss">{x.interview.completed}</span> : x.interview.inProgress}
                    </p>
                  </div>
                  {s.aggregate.answered > 0 && <p className="font-display text-3xl text-ink" title={x.interview.overall}>{s.aggregate.overall}<span className="text-sm text-muted">/10</span></p>}
                  <Link href={`/interview/${s.generationId}?session=${s.id}`} className="btn btn-ghost !py-1.5 !text-sm">{x.interview.open}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </div>
  );
}
