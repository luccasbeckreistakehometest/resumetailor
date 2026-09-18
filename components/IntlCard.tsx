"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import type { GenerationView } from "@/lib/server/generations";
import { Button, Icon, Notice } from "@/components/ui";

type Version = { target: string; notes: string[]; missingNumbers: string[]; left: number };

/** "Currículo pra vaga gringa": EN / ES / PT chips on an unlocked kit (the kit's own language excluded). */
export function IntlCard({ gen }: { gen: GenerationView }) {
  const { r, l, x } = useI18n();
  const I = r.intl;
  const targets = (["en", "es", "pt"] as const).filter((t) => t !== gen.lang);
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [error, setError] = useState("");
  if (!gen.kit) return <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]" data-testid="intl-locked">{I.locked}</p>;

  async function make(target: string) {
    setBusy(target); setError("");
    const res = await fetch(`/api/generations/${gen.id}/intl`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(res.status === 429 ? I.used : apiErrorText(j, l, x.errors.generic)); return; }
    setVersion(j);
  }
  const base = `/api/generations/${gen.id}/export?variant=intl:${version?.target}`;
  return (
    <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="intl">
      <p className="eyebrow">{I.title}</p>
      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{I.intro}</p>
      <div className="mt-[var(--s-4)] flex flex-wrap gap-[var(--s-3)]">
        {targets.map((t) => (
          <Button key={t} variant="outline" size="sm" onClick={() => void make(t)} loading={busy === t} disabled={!!busy} data-testid={`intl-${t}`}>{busy === t ? I.working : I.make(I.langs[t])}</Button>
        ))}
      </div>
      {version && (
        <div className="mt-[var(--s-5)] bg-[var(--sunken)] p-[var(--s-5)] font-sans text-[length:var(--ui-13)]" data-testid="intl-result" data-target={version.target}>
          <div className="flex flex-wrap gap-x-[var(--s-5)] gap-y-[var(--s-2)] font-medium">
            {[
              { href: `/print?id=${gen.id}&variant=intl:${version.target}`, label: I.open, test: "intl-print", external: true },
              { href: `${base}&doc=resume&format=docx`, label: I.word, test: "intl-docx", external: false },
              { href: `${base}&doc=resume&format=txt`, label: I.txt, test: "", external: false },
            ].map((lnk) => (
              <a key={lnk.label} href={lnk.href} target={lnk.external ? "_blank" : undefined} className="text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]" {...(lnk.test ? { "data-testid": lnk.test } : {})}>{lnk.label}</a>
            ))}
          </div>
          <p className="eyebrow mt-[var(--s-5)]">{I.notes}</p>
          <ul className="mt-[var(--s-2)] flex flex-col gap-[var(--s-2)]">
            {version.notes.map((n) => (
              <li key={n} className="flex items-start gap-[var(--s-3)] text-[color:var(--ink-2)]">
                <span className="relative top-[2px] shrink-0 text-[color:var(--kept)]"><Icon name="check" size={16} /></span>{n}
              </li>
            ))}
          </ul>
          <p className={"mt-[var(--s-4)] " + (version.missingNumbers.length ? "text-[color:var(--mark)]" : "text-[color:var(--kept)]")} data-testid="intl-numbers">{version.missingNumbers.length ? I.missing(version.missingNumbers.join(", ")) : I.allNumbers}</p>
          <p className="mt-[var(--s-2)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">{I.left(version.left)}</p>
        </div>
      )}
      {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span>{error}</span></Notice>}
    </section>
  );
}
