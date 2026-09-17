"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { GenerationView } from "@/lib/server/generations";

type Version = { id: string; source: string; createdAt: string; updatedAt: string; chars: number };

/** The version history with restore; `stamp` changes whenever the résumé was saved, to refresh the list. */
export function VersionsPanel({ genId, stamp, onRestored }: { genId: string; stamp: number; onRestored: (g: GenerationView) => void }) {
  const { r, lang } = useI18n();
  const E = r.editor;
  const [items, setItems] = useState<Version[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/generations/${genId}/versions`, { cache: "no-store" }).then((res) => (res.ok ? res.json() : { items: [] })).then((j) => { if (alive) setItems(j.items ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [genId, stamp]);

  async function restore(versionId: string) {
    const res = await fetch(`/api/generations/${genId}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId }) });
    if (!res.ok) return;
    onRestored(await res.json());
    setNote(E.restored);
  }
  const when = (iso: string) => new Date(iso).toLocaleString(lang === "pt" ? "pt-BR" : lang, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const original = items.length ? items[items.length - 1] : null;

  return (
    <details className="card p-4" data-testid="versions">
      <summary className="cursor-pointer font-semibold text-ink">🕘 {E.versions} {items.length > 0 && <span className="text-muted">({items.length})</span>}</summary>
      {items.length === 0 ? <p className="mt-2 text-sm text-muted">{E.versionsEmpty}</p> : (
        <>
          {original?.source === "ai" && items.length > 1 && <button type="button" onClick={() => void restore(original.id)} className="btn btn-ghost mt-3 !py-1.5 !text-sm" data-testid="back-to-ai">↩ {E.backToAi}</button>}
          <ul className="mt-3 space-y-1.5 text-sm">
            {items.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3" data-testid="version-item" data-source={v.source}>
                <span className="w-20 shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-center text-xs font-semibold text-ink">{E.source[v.source] ?? v.source}</span>
                <span className="flex-1 text-muted">{when(v.updatedAt)}</span>
                {i > 0 && <button type="button" onClick={() => void restore(v.id)} className="text-xs font-semibold text-oxblood" data-testid="version-restore">{E.restore}</button>}
              </li>
            ))}
          </ul>
        </>
      )}
      {note && <p className="mt-2 text-sm text-moss" role="status">{note}</p>}
    </details>
  );
}
