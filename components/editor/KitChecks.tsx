"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { diffLines, undoRow, wordMarks, type DiffRow } from "@/lib/text/diff";
import type { GenerationView } from "@/lib/server/generations";

type Props = { gen: GenerationView; resume: string; onReplace: (text: string) => void; view: "truth" | "diff"; onEdit?: () => void; onGen?: (g: GenerationView) => void };

/**
 * The truth check and "sounds human" cards (view "truth"), or the side-by-side "what changed"
 * with a per-line undo (view "diff"). Only for an unlocked kit; the numbers come from the server.
 */
export function KitChecks({ gen, resume, onReplace, view, onEdit, onGen }: Props) {
  if (view === "diff") return <ChangesView original={gen.original} resume={resume} onReplace={onReplace} />;
  return <TruthCards gen={gen} onEdit={onEdit} onGen={onGen} />;
}

export function TruthCards({ gen, onEdit, onGen, compact }: { gen: GenerationView; onEdit?: () => void; onGen?: (g: GenerationView) => void; compact?: boolean }) {
  const { r } = useI18n();
  const C = r.checks;
  const [local, setLocal] = useState<GenerationView | null>(null);
  const g = onGen ? gen : local && local.id === gen.id ? local : gen;
  const checks = g.checks;
  if (!checks) return null;
  const items = checks.truth.items ?? [];

  async function ack(key: string, value: boolean) {
    const res = await fetch(`/api/generations/${g.id}/truth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ack: value }) });
    if (!res.ok) return;
    const next = (await res.json()) as GenerationView;
    setLocal(next); onGen?.(next);
  }

  return (
    <div className="space-y-4">
      <section className="card p-4" data-testid="truth-card" data-pending={checks.truth.pending}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-xl text-ink">🔎 {C.truthTitle}</p>
          <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + (checks.truth.pending ? "bg-gold-2 text-ink" : "bg-moss-2 text-moss")} data-testid="truth-pending">{C.pending(checks.truth.pending)}</span>
        </div>
        {!compact && <p className="mt-1 text-sm text-ink-2">{C.truthIntro}</p>}
        <p className="mt-1 text-xs text-muted">{C.checked(checks.truth.checked)}{checks.truth.confirmed ? ` · ${C.confirmedCount(checks.truth.confirmed)}` : ""}</p>
        {items.length === 0 ? <p className="mt-2 text-sm text-moss">✓ {C.allGood}</p> : (
          <ul className="mt-3 space-y-2">
            {items.slice(0, compact ? 4 : 50).map((it) => (
              <li key={it.key} className={"rounded-xl border p-3 text-sm " + (it.acked ? "border-edge bg-paper opacity-70" : "border-gold bg-paper")} data-testid="truth-item" data-acked={it.acked ? "1" : "0"} data-kind={it.kind}>
                <p><span className="text-xs font-semibold uppercase tracking-wide text-muted">{C.kind[it.kind]}</span> · <strong className="text-ink">{it.text}</strong></p>
                {it.line && it.line !== it.text && <p className="mt-0.5 text-ink-2">“{it.line}”</p>}
                {!it.acked && !compact && <p className="mt-0.5 text-xs text-muted">{C.why}</p>}
                <div className="mt-2 flex flex-wrap gap-3">
                  {it.acked ? (
                    <><span className="text-xs font-semibold text-moss">✓ {C.confirmed}</span><button type="button" onClick={() => void ack(it.key, false)} className="text-xs text-muted hover:text-ink">{C.undoMine}</button></>
                  ) : (
                    <>
                      <button type="button" onClick={() => void ack(it.key, true)} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper" data-testid="truth-ack">{C.itsMine}</button>
                      {onEdit ? <button type="button" onClick={onEdit} className="text-xs font-semibold text-oxblood">{C.edit}</button>
                        : <Link href={`/edit/${g.id}`} className="text-xs font-semibold text-oxblood">{C.edit}</Link>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4" data-testid="human-card" data-score={checks.human.score}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl text-ink">🗣 {C.humanTitle}</p>
          <span className={"font-display text-2xl " + (checks.human.score >= 90 ? "text-moss" : checks.human.score >= 70 ? "text-gold" : "text-oxblood")}>{C.humanScore(checks.human.score)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-moss" style={{ width: `${checks.human.score}%` }} /></div>
        {checks.human.flagged === 0 ? <p className="mt-2 text-sm text-moss">✓ {C.humanGood}</p> : (
          <>
            <p className="mt-2 text-sm text-ink-2">{C.humanIntro}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {(checks.human.hits ?? []).map((h) => <li key={h.phrase} data-testid="human-hit"><strong className="text-oxblood">“{h.phrase}”</strong> <span className="text-muted">— {h.line}</span></li>)}
              {(checks.human.patterns ?? []).map((p, i) => <li key={i} className="text-ink-2">⚠ {C.pattern[p.kind]} <span className="text-muted">— {p.line}</span></li>)}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function ChangesView({ original, resume, onReplace }: { original: string | null; resume: string; onReplace: (t: string) => void }) {
  const { r } = useI18n();
  const C = r.checks;
  const [only, setOnly] = useState(true);
  if (!original) return <p className="card p-5 text-sm text-ink-2" data-testid="changes-none">{C.noOriginal}</p>;
  const rows = diffLines(original, resume);
  const count = (k: DiffRow["kind"]) => rows.filter((x) => x.kind === k).length;
  const shown = only ? rows.filter((x) => x.kind !== "same") : rows;
  return (
    <section className="space-y-3" data-testid="changes">
      <div>
        <p className="font-display text-2xl text-ink">{C.changesTitle}</p>
        <p className="mt-1 text-sm text-ink-2">{C.changesIntro}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span data-testid="changes-summary">{C.summary(count("change"), count("add"), count("del"))}</span>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />{C.onlyChanges}</label>
        </div>
      </div>
      <div className="hidden grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid"><span>{C.before}</span><span>{C.after}</span></div>
      <ul className="space-y-2">
        {shown.map((row, i) => (
          <li key={`${row.kind}-${row.bIndex}-${i}`} className="grid gap-2 rounded-xl border border-edge bg-surface p-2 text-sm sm:grid-cols-2" data-testid="diff-row" data-kind={row.kind}>
            <p className={"rounded-lg px-2 py-1 " + (row.kind === "del" || row.kind === "change" ? "bg-oxblood/5 text-ink-2 line-through decoration-oxblood/40" : "text-muted")}>{"a" in row ? row.a : "—"}</p>
            <div className={"rounded-lg px-2 py-1 " + (row.kind === "add" || row.kind === "change" ? "bg-moss-2 text-ink" : "text-muted")}>
              {"b" in row ? (row.kind === "change" ? wordMarks(row.a, row.b).map((w, k) => <span key={k} className={w.added ? "font-semibold text-moss" : ""}>{w.text}</span>) : row.b) : `(${C.removed})`}
              {row.kind !== "same" && (
                <button type="button" onClick={() => onReplace(undoRow(resume, row))} className="mt-1 block text-xs font-semibold text-oxblood" data-testid="diff-undo">{C.undo}</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
