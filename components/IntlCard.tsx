"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import type { GenerationView } from "@/lib/server/generations";

type Version = { target: string; notes: string[]; missingNumbers: string[]; left: number };

/** "Currículo pra vaga gringa": EN / ES / PT chips on an unlocked kit (the kit's own language excluded). */
export function IntlCard({ gen }: { gen: GenerationView }) {
  const { r, l, x } = useI18n();
  const I = r.intl;
  const targets = (["en", "es", "pt"] as const).filter((t) => t !== gen.lang);
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [error, setError] = useState("");
  if (!gen.kit) return <p className="text-sm text-ink-2" data-testid="intl-locked">🌍 {I.locked}</p>;

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
    <section className="rounded-2xl border border-edge bg-surface p-5" data-testid="intl">
      <p className="font-display text-xl text-ink">🌍 {I.title}</p>
      <p className="mt-1 text-sm text-ink-2">{I.intro}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {targets.map((t) => <button key={t} type="button" onClick={() => void make(t)} disabled={!!busy} className="btn btn-ghost !py-1.5 !text-sm" data-testid={`intl-${t}`}>{busy === t ? I.working : I.make(I.langs[t])}</button>)}
      </div>
      {version && (
        <div className="mt-4 rounded-xl bg-paper p-4 text-sm" data-testid="intl-result" data-target={version.target}>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
            <Link href={`/print?id=${gen.id}&variant=intl:${version.target}`} target="_blank" className="text-oxblood" data-testid="intl-print">{I.open}</Link>
            <a href={`${base}&doc=resume&format=docx`} className="text-oxblood" data-testid="intl-docx">{I.word}</a>
            <a href={`${base}&doc=resume&format=txt`} className="text-oxblood">{I.txt}</a>
          </div>
          <p className="eyebrow mt-3">{I.notes}</p>
          <ul className="mt-1 space-y-1">{version.notes.map((n) => <li key={n} className="flex gap-2"><span className="text-moss">✓</span>{n}</li>)}</ul>
          <p className={"mt-2 " + (version.missingNumbers.length ? "text-oxblood" : "text-moss")} data-testid="intl-numbers">{version.missingNumbers.length ? I.missing(version.missingNumbers.join(", ")) : I.allNumbers}</p>
          <p className="mt-1 text-xs text-muted">{I.left(version.left)}</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-oxblood" role="alert">{error}</p>}
    </section>
  );
}
