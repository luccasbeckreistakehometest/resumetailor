"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { COVER_TONES, EMAIL_KINDS, type CoverTone, type EmailKind, type VariantKind } from "@/lib/ai/variants";
import type { GenerationView } from "@/lib/server/generations";
import type { VariantView } from "@/lib/server/variants";

type Tone = "original" | CoverTone;

/**
 * The cover letter in four registers and the three recruiter emails, on an unlocked kit. Each
 * text is fetched once (the server caches it with the kit) and copied with one click; emails
 * also open in the person's mail app with subject and body filled in.
 */
export function LetterStudio({ gen }: { gen: GenerationView }) {
  const { x } = useI18n();
  const L = x.letters;
  const [ready, setReady] = useState<Record<string, VariantView>>({});
  const [tone, setTone] = useState<Tone>("original");
  const [email, setEmail] = useState<EmailKind | null>(null);
  const [busy, setBusy] = useState<VariantKind | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/generations/${gen.id}/variants`, { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (cancelled) return;
      const map: Record<string, VariantView> = {};
      for (const v of (j.items ?? []) as VariantView[]) map[v.kind] = v;
      setReady(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [gen.id]);

  async function load(kind: VariantKind) {
    if (ready[kind]) return;
    setBusy(kind); setError("");
    const r = await fetch(`/api/generations/${gen.id}/variants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setError(j.error || x.errors.generic); return; }
    setReady((cur) => ({ ...cur, [kind]: j }));
  }
  const pickTone = (t: Tone) => { setTone(t); if (t !== "original") void load(`cover:${t}`); };
  const pickEmail = (k: EmailKind) => { setEmail(k); void load(`email:${k}`); };
  async function copy(key: string, text: string) { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch {} }

  const letter = tone === "original" ? { body: gen.kit?.coverLetter ?? "", cached: false, fresh: false } : ready[`cover:${tone}`] ? { body: ready[`cover:${tone}`].body, cached: ready[`cover:${tone}`].cached, fresh: true } : null;
  const mail = email ? ready[`email:${email}`] ?? null : null;
  const mailto = mail ? `mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}` : "";

  return (
    <div className="mt-6" data-testid="letters">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{L.title}</p>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={L.title}>
          {(["original", ...COVER_TONES] as Tone[]).map((t) => (
            <button key={t} role="tab" aria-selected={tone === t} onClick={() => pickTone(t)} title={t === "original" ? undefined : L.toneHint[t]}
              className={"rounded-full border px-3 py-1 text-xs font-medium transition " + (tone === t ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2 hover:border-ink")} data-testid={`tone-${t}`}>
              {L.tones[t]}{t !== "original" && ready[`cover:${t}`] ? " ·" : ""}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">{L.subtitle}</p>
      {busy?.startsWith("cover:") ? (
        <p className="mt-4 text-sm font-medium text-ink-2" data-testid="letter-busy">{L.rewriting}</p>
      ) : letter && (
        <div className="mt-3 rounded-xl border border-edge bg-paper p-4" data-testid="letter" data-tone={tone}>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink" data-testid="letter-body">{letter.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-edge pt-3">
            <button onClick={() => void copy("letter", letter.body)} className="btn btn-ghost !py-1.5 !text-xs" data-testid="letter-copy">{copied === "letter" ? L.copied : L.copy}</button>
            {letter.fresh && letter.cached && <span className="text-xs text-muted" data-testid="letter-cached">{L.cached}</span>}
          </div>
        </div>
      )}

      <p className="eyebrow mt-8">{L.emailsTitle}</p>
      <p className="mt-1 text-xs text-muted">{L.emailsSubtitle}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {EMAIL_KINDS.map((k) => (
          <button key={k} onClick={() => pickEmail(k)} className={"rounded-xl border p-3 text-left transition " + (email === k ? "border-ink bg-surface" : "border-edge-2 bg-paper hover:border-ink")} data-testid={`email-${k}`}>
            <p className="text-sm font-semibold text-ink">{L.kinds[k]}{ready[`email:${k}`] ? " ·" : ""}</p>
            <p className="mt-0.5 text-xs text-ink-2">{L.kindHint[k]}</p>
          </button>
        ))}
      </div>
      {busy?.startsWith("email:") ? (
        <p className="mt-4 text-sm font-medium text-ink-2" data-testid="email-busy">{L.writing}</p>
      ) : mail && (
        <div className="mt-3 rounded-xl border border-edge bg-paper p-4" data-testid="email" data-kind={email ?? ""}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{L.subject}</p>
          <p className="mt-0.5 font-medium text-ink" data-testid="email-subject">{mail.subject}</p>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink" data-testid="email-body">{mail.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-edge pt-3">
            <button onClick={() => void copy("email", `${mail.subject}\n\n${mail.body}`)} className="btn btn-ghost !py-1.5 !text-xs" data-testid="email-copy">{copied === "email" ? L.copied : L.copy}</button>
            <a href={mailto} className="btn btn-ink !py-1.5 !text-xs" data-testid="email-mailto">{L.openMail}</a>
            {mail.cached && <span className="text-xs text-muted" data-testid="email-cached">{L.cached}</span>}
          </div>
        </div>
      )}
      {(letter || mail) && <p className="mt-3 text-[11px] text-muted">{L.placeholders}</p>}
      {error && <p className="mt-3 text-sm text-oxblood" role="alert" data-testid="letters-error">{error}</p>}
    </div>
  );
}
