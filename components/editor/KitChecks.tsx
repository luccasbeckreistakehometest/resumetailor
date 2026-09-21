"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { diffLines, undoRow, wordMarks, type DiffRow } from "@/lib/text/diff";
import type { GenerationView } from "@/lib/server/generations";
import { Badge, Button, Checkbox, Icon, Meter } from "@/components/ui";

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
    <div className="flex flex-col gap-[var(--s-8)]">
      <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="truth-card" data-pending={checks.truth.pending}>
        <div className="flex flex-wrap items-baseline justify-between gap-[var(--s-3)]">
          <p className="eyebrow">{C.truthTitle}</p>
          <span data-testid="truth-pending"><Badge tone={checks.truth.pending ? "query" : "kept"}>{C.pending(checks.truth.pending)}</Badge></span>
        </div>
        {!compact && <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{C.truthIntro}</p>}
        <p className="mt-[var(--s-2)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">
          {C.checked(checks.truth.checked)}{checks.truth.confirmed ? ` · ${C.confirmedCount(checks.truth.confirmed)}` : ""}
        </p>
        {items.length === 0 ? (
          <p className="mt-[var(--s-4)] flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--kept)]"><Icon name="check" size={16} />{C.allGood}</p>
        ) : (
          <ul className="mt-[var(--s-4)] border-t border-[var(--rule-hairline)]">
            {items.slice(0, compact ? 4 : 50).map((it) => (
              <li
                key={it.key}
                className="border-b border-[var(--rule-hairline)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)]"
                style={{ borderLeft: `2px solid ${it.acked ? "var(--kept)" : "var(--query)"}`, paddingLeft: "var(--s-4)", opacity: it.acked ? 0.75 : 1 }}
                data-testid="truth-item"
                data-acked={it.acked ? "1" : "0"}
                data-kind={it.kind}
              >
                <p>
                  <span className="eyebrow">{C.kind[it.kind]}</span>{" · "}
                  <strong className="font-semibold text-[color:var(--ink)]">{it.text}</strong>
                </p>
                {it.line && it.line !== it.text && <p className="doc-12 mt-[var(--s-2)] text-[color:var(--ink-2)]">“{it.line}”</p>}
                {!it.acked && !compact && <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{C.why}</p>}
                <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-4)]">
                  {it.acked ? (
                    <>
                      <span className="flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--kept)]"><Icon name="check" size={16} />{C.confirmed}</span>
                      <button type="button" onClick={() => void ack(it.key, false)} className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]">{C.undoMine}</button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => void ack(it.key, true)} data-testid="truth-ack">{C.itsMine}</Button>
                      {onEdit
                        ? <button type="button" onClick={onEdit} className="font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{C.edit}</button>
                        : <Link href={`/edit/${g.id}`} className="font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{C.edit}</Link>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="human-card" data-score={checks.human.score}>
        <Meter label={C.humanTitle} value={checks.human.score} caption={checks.human.flagged === 0 ? C.humanGood : C.humanIntro} good={90} poor={0} unit="/100" />
        {checks.human.flagged > 0 && (
          <>
            <ul className="mt-[var(--s-4)] border-t border-[var(--rule-hairline)]">
              {(checks.human.hits ?? []).map((h) => (
                <li key={h.phrase} className="border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)]" data-testid="human-hit">
                  <strong className="font-medium text-[color:var(--mark)]">“{h.phrase}”</strong> <span className="text-[color:var(--ink-muted)]">— {h.line}</span>
                </li>
              ))}
              {(checks.human.patterns ?? []).map((p, i) => (
                <li key={i} className="flex items-start gap-[var(--s-3)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]">
                  <span className="relative top-[2px] shrink-0 text-[color:var(--query)]"><Icon name="flag" size={16} /></span>
                  <span>{C.pattern[p.kind]} <span className="text-[color:var(--ink-muted)]">— {p.line}</span></span>
                </li>
              ))}
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
  if (!original) return <p className="border border-[var(--rule)] p-[var(--s-5)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]" data-testid="changes-none">{C.noOriginal}</p>;
  const rows = diffLines(original, resume);
  const count = (k: DiffRow["kind"]) => rows.filter((x) => x.kind === k).length;
  const shown = only ? rows.filter((x) => x.kind !== "same") : rows;
  return (
    <section className="flex flex-col gap-[var(--s-5)]" data-testid="changes">
      <div>
        <p className="doc-26 text-[color:var(--ink)]">{C.changesTitle}</p>
        <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{C.changesIntro}</p>
        <div className="mt-[var(--s-4)] flex flex-wrap items-center gap-[var(--s-5)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
          <span data-testid="changes-summary">{C.summary(count("change"), count("add"), count("del"))}</span>
          <Checkbox checked={only} onChange={(e) => setOnly(e.target.checked)} label={C.onlyChanges} />
        </div>
      </div>
      <div className="hidden grid-cols-2 gap-[var(--s-4)] border-b border-[var(--rule)] pb-[var(--s-2)] sm:grid">
        <span className="eyebrow">{C.before}</span><span className="eyebrow">{C.after}</span>
      </div>
      <ul>
        {shown.map((row, i) => (
          <li key={`${row.kind}-${row.bIndex}-${i}`} className="grid gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] sm:grid-cols-2" data-testid="diff-row" data-kind={row.kind}>
            <p className={row.kind === "del" || row.kind === "change" ? "text-[color:var(--ink-muted)] line-through decoration-[var(--mark)]" : "text-[color:var(--ink-40)]"}>{"a" in row ? row.a : "—"}</p>
            <div className={row.kind === "add" || row.kind === "change" ? "text-[color:var(--ink)]" : "text-[color:var(--ink-40)]"}>
              {"b" in row ? (row.kind === "change" ? wordMarks(row.a, row.b).map((w, k) => <span key={k} className={w.added ? "font-medium text-[color:var(--kept)]" : ""}>{w.text}</span>) : row.b) : `(${C.removed})`}
              {row.kind !== "same" && (
                <button type="button" onClick={() => onReplace(undoRow(resume, row))} className="mt-[var(--s-2)] block font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-muted)] underline underline-offset-[3px] hover:text-[color:var(--ink)]" data-testid="diff-undo">{C.undo}</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
