"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { GenerationView } from "@/lib/server/generations";
import { Badge, Button } from "@/components/ui";

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
    <details className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="versions">
      <summary className="eyebrow cursor-pointer">
        {E.versions}{items.length > 0 && <span className="ml-[var(--s-2)] font-mono tabular-nums normal-case tracking-normal text-[color:var(--ink-muted)]">{items.length}</span>}
      </summary>
      {items.length === 0 ? <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{E.versionsEmpty}</p> : (
        <>
          {original?.source === "ai" && items.length > 1 && (
            <Button variant="outline" size="sm" icon="history" className="mt-[var(--s-4)]" onClick={() => void restore(original.id)} data-testid="back-to-ai">{E.backToAi}</Button>
          )}
          <ul className="mt-[var(--s-4)] border-t border-[var(--rule-hairline)]">
            {items.map((v, i) => (
              <li key={v.id} className="flex items-center gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-2)]" data-testid="version-item" data-source={v.source}>
                <Badge>{E.source[v.source] ?? v.source}</Badge>
                <span className="flex-1 font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">{when(v.updatedAt)}</span>
                {i > 0 && (
                  <button type="button" onClick={() => void restore(v.id)} className="font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid="version-restore">{E.restore}</button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {note && <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--kept)]" role="status">{note}</p>}
    </details>
  );
}
