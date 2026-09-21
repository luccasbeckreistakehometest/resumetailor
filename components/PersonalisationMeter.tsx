"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import type { GenerationView } from "@/lib/server/generations";
import { Button, Meter, Notice, Token } from "@/components/ui";

/**
 * The quality-over-volume guard on a tailored kit: how much of the résumé actually engages with
 * the posting, and one click to go deeper when it reads generic (surface 5).
 *
 * This was the third meter design on one screen — its own bar, its own colour ramp, its own pills.
 * It is the system's Meter now. "Generic" is a mark-toned notice rather than a red bar, because in
 * this system red is a correction to make, not a score to read.
 */
export function PersonalisationMeter({ gen, onUpdate }: { gen: GenerationView; onUpdate: (g: GenerationView) => void }) {
  const { x, l } = useI18n();
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
    if (r.status === 429 && j.error === "limit") { setLimit(true); return; }
    if (!r.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    onUpdate(j);
  }

  // The meter itself is computed server-side from the stored kit, so a locked preview can show it
  // without leaking the text. Deepening is a whole new generation, so it waits for the unlock.
  const canDeepen = gen.unlocked && !limit && gen.deepenLeft > 0;

  return (
    <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="personalisation" data-generic={m.generic ? "1" : "0"}>
      <Meter
        label={P.title}
        value={m.score}
        caption={P.breakdown(m.coverage, m.specific, m.bullets)}
        good={75}
        poor={0}
      />
      <p className="sr-only" data-testid="pers-score">{m.score}</p>

      {m.generic ? (
        <Notice tone="mark" icon="flag" className="mt-[var(--s-5)]"><span data-testid="pers-generic">{P.generic}</span></Notice>
      ) : (
        <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{m.score >= 75 ? P.strong : P.okay}</p>
      )}

      {m.missing.length > 0 && (
        <div className="mt-[var(--s-5)]">
          <p className="eyebrow">{P.missing}</p>
          <ul className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-2)]" data-testid="pers-missing">
            {m.missing.slice(0, 10).map((k) => <li key={k}><Token state="missing">{k}</Token></li>)}
          </ul>
        </div>
      )}

      <div className="mt-[var(--s-5)] flex flex-wrap items-center gap-[var(--s-4)]">
        {canDeepen ? (
          <Button size="sm" variant={m.generic ? "primary" : "outline"} onClick={deepen} loading={busy} data-testid="deepen">{busy ? P.deepening : P.deepen}</Button>
        ) : !gen.unlocked
          ? <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]" data-testid="deepen-locked">{P.locked}</span>
          : <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]" data-testid="deepen-limit">{P.limit}</span>}
        {gen.deepened > 0 && <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{P.deepenedTimes(gen.deepened)}</span>}
      </div>
      {error && <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--mark)]" role="alert">{error}</p>}
      <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{P.honest}</p>
    </section>
  );
}
