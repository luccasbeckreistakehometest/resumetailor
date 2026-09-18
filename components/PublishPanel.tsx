"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { ShareBar } from "@/app/(site)/cv/[slug]/ShareBar";
import { TEMPLATES, type Template } from "@/lib/resume/public";
import type { GenerationView } from "@/lib/server/generations";
import type { PublicResumeView } from "@/lib/server/publicResumes";
import { Badge, Button, Checkbox, Chip, Icon, Input, Notice } from "@/components/ui";

type Patch = { enabled?: boolean; template?: Template; hideContact?: boolean; indexable?: boolean; pin?: string | null };

/**
 * The owner's controls for a kit's web résumé: publish on/off, template, contact details,
 * search-engine opt-in, PIN — every change saves at once — plus the link, share buttons and
 * the view counter. Only rendered on an unlocked kit.
 */
export function PublishPanel({ gen, onUpdate }: { gen: GenerationView; onUpdate?: (p: PublicResumeView | null) => void }) {
  const { x, d, lang, l } = useI18n();
  const P = x.publish;
  const [saved, setSaved] = useState<PublicResumeView | null>(gen.publicResume ?? null);
  // The switches flip the moment they are clicked; the server's answer replaces the guess (or reverts it on error).
  const [optimistic, setOptimistic] = useState<Partial<PublicResumeView> | null>(null);
  const pub: PublicResumeView | null = saved || optimistic ? { slug: "", template: "modern", hideContact: false, indexable: false, hasPin: false, takenDown: false, views: 0, lastViewedAt: null, createdAt: "", enabled: false, ...saved, ...optimistic } : null;
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
    if (!r.ok) { setError(r.status === 409 && j.error === "unlock_first" ? P.needUnlock : apiErrorText(j, l, x.errors.generic)); return; }
    setSaved(j.publicResume); onUpdate?.(j.publicResume);
  }
  async function refresh() {
    const r = await fetch(`/api/generations/${gen.id}/publish`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setSaved(j.publicResume);
  }
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang);

  return (
    <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="publish" data-enabled={pub?.enabled ? "1" : "0"}>
      {pub?.takenDown && (
        <Notice tone="query" className="mb-[var(--s-4)]"><span role="status" data-testid="publish-taken-down">{l.apiErrors.taken_down}</span></Notice>
      )}
      <p className="eyebrow">{P.title}</p>
      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{P.subtitle}</p>
      <div className="mt-[var(--s-4)]">
        <Checkbox checked={!!pub?.enabled} disabled={busy} onChange={(e) => void save({ enabled: e.target.checked })} data-testid="publish-toggle" label={pub?.enabled ? P.on : P.toggle} />
      </div>

      {pub?.enabled && (
        <div className="mt-[var(--s-6)] flex flex-col gap-[var(--s-6)]">
          <div>
            <p className="eyebrow">{P.link}</p>
            <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-3)]">
              <Input readOnly className="min-w-0 flex-1 font-mono text-[length:var(--mn-13)]" value={url} onFocus={(e) => e.currentTarget.select()} data-testid="publish-url" aria-label={P.link} />
              <Button href={url} size="sm" icon="external" iconEnd data-testid="publish-open">{P.open}</Button>
            </div>
            <div className="mt-[var(--s-3)]"><ShareBar url={url} text={P.shareText(gen.title)} labels={{ share: P.share, copy: P.copy, copied: P.copied, whatsapp: P.whatsapp, linkedin: P.linkedin }} testId="publish" /></div>
          </div>

          <div>
            <p className="eyebrow">{P.template}</p>
            <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-2)]">
              {TEMPLATES.map((t) => (
                <Chip key={t} selected={pub.template === t} disabled={busy} onClick={() => void save({ template: t })} data-testid={`publish-template-${t}`}>{d.print.templates[t]}</Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[var(--s-3)]">
            <Checkbox checked={pub.hideContact} disabled={busy} onChange={(e) => void save({ hideContact: e.target.checked })} data-testid="publish-hide" label={P.hideContact} />
            <Checkbox checked={pub.indexable} disabled={busy} onChange={(e) => void save({ indexable: e.target.checked })} data-testid="publish-index" label={P.indexable} />
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-[var(--s-3)]">
              <p className="eyebrow">{P.pin}</p>
              {pub.hasPin && <span data-testid="publish-has-pin"><Badge tone="kept">{P.pinOn}</Badge></span>}
            </div>
            <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-3)]">
              <Input className="w-[150px]" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={P.pinPh} maxLength={12} data-testid="publish-pin" aria-label={P.pin} />
              <Button variant="outline" size="sm" onClick={() => { void save({ pin }); setPin(""); }} disabled={busy || !pin} data-testid="publish-pin-save">{P.pinSet}</Button>
              {pub.hasPin && <Button variant="quiet" size="sm" onClick={() => void save({ pin: null })} disabled={busy} data-testid="publish-pin-clear">{P.pinClear}</Button>}
            </div>
            <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{P.pinHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-[var(--s-4)] border-t border-[var(--rule-hairline)] pt-[var(--s-4)]">
            <span className="flex items-center gap-[var(--s-2)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-2)]" data-testid="publish-views">
              <Icon name="eye" size={16} />{pub.views === 0 ? P.noViews : P.views(pub.views)}
            </span>
            {pub.lastViewedAt && <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{P.lastViewed(dateOf(pub.lastViewedAt))}</span>}
            <button onClick={refresh} className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]" aria-label={P.link} data-testid="publish-refresh"><Icon name="history" size={16} /></button>
          </div>
        </div>
      )}
      {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span data-testid="publish-error">{error}</span></Notice>}
    </section>
  );
}
