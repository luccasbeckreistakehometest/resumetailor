"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";
import type { GenerationView } from "@/lib/server/generations";

export default function LibraryPage() {
  const { d, x, lang } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<GenerationView[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null); const [draft, setDraft] = useState("");

  const load = () => fetch("/api/generations", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.items ?? []));
  useEffect(() => { void load(); }, [user?.id]);

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
                {g.unlocked && <Link href={`/print?id=${g.id}`} target="_blank" className="btn btn-ink !py-1.5 !text-sm">{x.library.print}</Link>}
                <button onClick={() => { setEditId(g.id); setDraft(g.title); }} className="text-sm text-muted hover:text-ink">{d.library.rename}</button>
                <button onClick={() => remove(g.id)} className="text-sm text-muted hover:text-oxblood">{d.library.delete}</button>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
