"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { GenerationView } from "@/lib/server/generations";

/**
 * The quality-over-volume guard on a tailored kit: how much of the résumé actually engages
 * with the posting, and one click to go deeper when it reads generic.
 */
export function PersonalisationMeter({ gen, onUpdate }: { gen: GenerationView; onUpdate: (g: GenerationView) => void }) {
  const { x } = useI18n();
  const P = x.personalisation;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(false);
  const m = gen.personalisation;
  if (!m) return null;

  async function deepen() {
    setBusy(true); setError("");
    const r = await fetch(`/api/generations/${gen.id}/deepen`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 429) { setLimit(true); return; }
    if (!r.ok) { setError(j.error || x.errors.generic); return; }
    onUpdate(j);
  }

  const tone = m.generic ? "text-oxblood" : m.score >= 75 ? "text-moss" : "text-ink";
  const bar = m.generic ? "bg-oxblood" : m.score >= 75 ? "bg-moss" : "bg-gold";
  const canDeepen = !limit && gen.deepenLeft > 0;

  return (
    <div className={"rounded-xl border p-5 " + (m.generic ? "border-oxblood/40 bg-oxblood/5" : "border-edge bg-surface")} data-testid="personalisation" data-generic={m.generic ? "1" : "0"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-2">{P.title}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-edge">{P.hint}</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <p className={"font-display text-4xl leading-none " + tone} data-testid="pers-score">{m.score}<span className="text-base text-muted">%</span></p>
        <div className="flex-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-2"><div className={"h-full rounded-full transition-all " + bar} style={{ width: `${m.score}%` }} /></div>
          <p className="mt-1.5 text-xs text-muted">{P.breakdown(m.coverage, m.specific, m.bullets)}</p>
        </div>
      </div>
      {m.generic
        ? <p className="mt-3 text-sm font-medium text-oxblood" data-testid="pers-generic">{P.generic}</p>
        : <p className="mt-3 text-sm text-ink-2">{m.score >= 75 ? P.strong : P.okay}</p>}
      {m.missing.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{P.missing}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="pers-missing">{m.missing.slice(0, 10).map((k) => <span key={k} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-edge">{k}</span>)}</div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canDeepen ? (
          <button onClick={deepen} disabled={busy} className={"btn !py-2 !text-sm " + (m.generic ? "btn-primary" : "btn-ghost")} data-testid="deepen">{busy ? P.deepening : P.deepen}</button>
        ) : <span className="text-xs text-muted" data-testid="deepen-limit">{P.limit}</span>}
        {gen.deepened > 0 && <span className="text-xs text-muted">{P.deepenedTimes(gen.deepened)}</span>}
        {error && <p className="text-sm text-oxblood" role="alert">{error}</p>}
      </div>
      <p className="mt-3 text-[11px] text-muted">{P.honest}</p>
    </div>
  );
}
