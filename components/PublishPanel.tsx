"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ShareBar } from "@/app/cv/[slug]/ShareBar";
import { TEMPLATES, type Template } from "@/lib/resume/public";
import type { GenerationView } from "@/lib/server/generations";
import type { PublicResumeView } from "@/lib/server/publicResumes";

type Patch = { enabled?: boolean; template?: Template; hideContact?: boolean; indexable?: boolean; pin?: string | null };

/**
 * The owner's controls for a kit's web résumé: publish on/off, template, contact details,
 * search-engine opt-in, PIN — every change saves at once — plus the link, share buttons and
 * the view counter. Only rendered on an unlocked kit.
 */
export function PublishPanel({ gen, onUpdate }: { gen: GenerationView; onUpdate?: (p: PublicResumeView | null) => void }) {
  const { x, d, lang } = useI18n();
  const P = x.publish;
  const [saved, setSaved] = useState<PublicResumeView | null>(gen.publicResume ?? null);
  // The switches flip the moment they are clicked; the server's answer replaces the guess (or reverts it on error).
  const [optimistic, setOptimistic] = useState<Partial<PublicResumeView> | null>(null);
  const pub: PublicResumeView | null = saved || optimistic ? { slug: "", template: "modern", hideContact: false, indexable: false, hasPin: false, views: 0, lastViewedAt: null, createdAt: "", enabled: false, ...saved, ...optimistic } : null;
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = typeof window !== "undefined" && pub?.slug ? `${window.location.origin}/cv/${pub.slug}` : "";

  async function save(patch: Patch) {
    setBusy(true); setError("");
    const { pin: _pin, ...guess } = patch; void _pin;
    setOptimistic(guess);
    const r = await fetch(`/api/generations/${gen.id}/publish`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    setBusy(false); setOptimistic(null);
    if (!r.ok) { setError(r.status === 409 ? P.needUnlock : j.error || x.errors.generic); return; }
    setSaved(j.publicResume); onUpdate?.(j.publicResume);
  }
  async function refresh() {
    const r = await fetch(`/api/generations/${gen.id}/publish`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSaved(j.publicResume);
  }
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang);

  return (
    <div className="rounded-xl border border-edge bg-surface p-5" data-testid="publish" data-enabled={pub?.enabled ? "1" : "0"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-2">{P.title}</h3>
          <p className="mt-1 text-xs text-muted">{P.subtitle}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" className="h-4 w-4 accent-[var(--oxblood)]" checked={!!pub?.enabled} disabled={busy} onChange={(e) => void save({ enabled: e.target.checked })} data-testid="publish-toggle" />
          {pub?.enabled ? P.on : P.toggle}
        </label>
      </div>

      {pub?.enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="eyebrow">{P.link}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input readOnly className="field min-w-0 flex-1 !py-2 !text-xs" value={url} onFocus={(e) => e.currentTarget.select()} data-testid="publish-url" aria-label={P.link} />
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ink !py-2 !text-sm" data-testid="publish-open">{P.open} ↗</a>
            </div>
            <div className="mt-2"><ShareBar url={url} text={P.shareText(gen.title)} labels={{ share: P.share, copy: P.copy, copied: P.copied, whatsapp: P.whatsapp, linkedin: P.linkedin }} testId="publish" /></div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-2">{P.template}:</span>
            {TEMPLATES.map((t) => (
              <button key={t} onClick={() => void save({ template: t })} disabled={busy} className={"rounded-full border px-2.5 py-1 text-xs font-medium transition " + (pub.template === t ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2 hover:border-ink")} data-testid={`publish-template-${t}`}>{d.print.templates[t]}</button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[var(--oxblood)]" checked={pub.hideContact} disabled={busy} onChange={(e) => void save({ hideContact: e.target.checked })} data-testid="publish-hide" />{P.hideContact}</label>
            <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[var(--oxblood)]" checked={pub.indexable} disabled={busy} onChange={(e) => void save({ indexable: e.target.checked })} data-testid="publish-index" />{P.indexable}</label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-2">{P.pin}:</span>
            {pub.hasPin && <span className="rounded-full bg-moss-2 px-2 py-0.5 text-[11px] font-semibold text-moss ring-1 ring-moss/30" data-testid="publish-has-pin">🔒 {P.pinOn}</span>}
            <input className="field w-36 !py-1.5 !text-sm" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={P.pinPh} maxLength={12} data-testid="publish-pin" aria-label={P.pin} />
            <button onClick={() => { void save({ pin }); setPin(""); }} disabled={busy || !pin} className="btn btn-ghost !py-1.5 !text-xs" data-testid="publish-pin-save">{P.pinSet}</button>
            {pub.hasPin && <button onClick={() => void save({ pin: null })} disabled={busy} className="text-xs text-muted hover:text-oxblood" data-testid="publish-pin-clear">{P.pinClear}</button>}
            <span className="text-xs text-muted">{P.pinHint}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-edge pt-3 text-sm">
            <span className="font-medium text-ink" data-testid="publish-views">👁 {pub.views === 0 ? P.noViews : P.views(pub.views)}</span>
            {pub.lastViewedAt && <span className="text-xs text-muted">{P.lastViewed(dateOf(pub.lastViewedAt))}</span>}
            <button onClick={refresh} className="text-xs text-muted underline-offset-2 hover:underline" data-testid="publish-refresh">↻</button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-oxblood" role="alert" data-testid="publish-error">{error}</p>}
    </div>
  );
}
