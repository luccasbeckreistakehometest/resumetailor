"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { COVER_TONES, EMAIL_KINDS, type CoverTone, type EmailKind, type VariantKind } from "@/lib/ai/variants";
import type { GenerationView } from "@/lib/server/generations";
import type { VariantView } from "@/lib/server/variants";
import { Button, Notice } from "@/components/ui";

type Tone = "original" | CoverTone;

/**
 * The cover letter in four registers and the three recruiter emails, on an unlocked kit. Each
 * text is fetched once (the server caches it with the kit) and copied with one click; emails
 * also open in the person's mail app with subject and body filled in.
 */
export function LetterStudio({ gen }: { gen: GenerationView }) {
  const { x, l } = useI18n();
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
    if (!r.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    setReady((cur) => ({ ...cur, [kind]: j }));
  }
  const pickTone = (t: Tone) => { setTone(t); if (t !== "original") void load(`cover:${t}`); };
  const pickEmail = (k: EmailKind) => { setEmail(k); void load(`email:${k}`); };
  async function copy(key: string, text: string) { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); } catch {} }

  const letter = tone === "original" ? { body: gen.kit?.coverLetter ?? "", cached: false, fresh: false } : ready[`cover:${tone}`] ? { body: ready[`cover:${tone}`].body, cached: ready[`cover:${tone}`].cached, fresh: true } : null;
  const mail = email ? ready[`email:${email}`] ?? null : null;
  const mailto = mail ? `mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}` : "";

  return (
    <div className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="letters">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--s-4)]">
        <p className="eyebrow">{L.title}</p>
        <div className="flex flex-wrap gap-[var(--s-2)]" role="tablist" aria-label={L.title}>
          {(["original", ...COVER_TONES] as Tone[]).map((t) => (
            <button key={t} role="tab" aria-selected={tone === t} onClick={() => pickTone(t)} title={t === "original" ? undefined : L.toneHint[t]}
              className={"inline-flex h-6 items-center rounded-[var(--r-1)] border px-[var(--s-3)] font-sans text-[length:var(--ui-12)] font-medium leading-none transition-colors " +
                (tone === t ? "border-[var(--ink)] bg-[var(--ink)] text-[color:var(--on-ink)]" : "border-[var(--rule-hairline)] bg-[var(--sunken)] text-[color:var(--ink-2)] hover:border-[var(--rule)]")} data-testid={`tone-${t}`}>
              {L.tones[t]}{t !== "original" && ready[`cover:${t}`] ? " ·" : ""}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{L.subtitle}</p>
      {busy?.startsWith("cover:") ? (
        <p className="mt-[var(--s-5)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]" data-testid="letter-busy">{L.rewriting}</p>
      ) : letter && (
        /* A cover letter is a document too: it gets the sheet and the document face. */
        <div className="sheet mt-[var(--s-4)] p-[var(--s-6)] sm:p-[var(--s-8)]" data-testid="letter" data-tone={tone}>
          <p className="doc-15 max-w-[var(--measure)] whitespace-pre-line text-[color:var(--ink)]" data-testid="letter-body">{letter.body}</p>
          <div className="mt-[var(--s-5)] flex flex-wrap items-center gap-[var(--s-4)] border-t border-[var(--rule-hairline)] pt-[var(--s-4)]">
            <Button variant="outline" size="sm" icon="copy" onClick={() => void copy("letter", letter.body)} data-testid="letter-copy">{copied === "letter" ? L.copied : L.copy}</Button>
            {letter.fresh && letter.cached && <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]" data-testid="letter-cached">{L.cached}</span>}
          </div>
        </div>
      )}

      <p className="eyebrow mt-[var(--s-9)]">{L.emailsTitle}</p>
      <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{L.emailsSubtitle}</p>
      <ul className="mt-[var(--s-4)] border-t border-[var(--rule-hairline)] sm:grid sm:grid-cols-3 sm:gap-x-[var(--s-6)]">
        {EMAIL_KINDS.map((k) => (
          <li key={k} className="border-b border-[var(--rule-hairline)]">
            <button onClick={() => pickEmail(k)} className="w-full py-[var(--s-4)] text-left" data-testid={`email-${k}`} aria-pressed={email === k}>
              <span className="flex items-baseline gap-[var(--s-2)]">
                <span className={"font-sans text-[length:var(--ui-13)] font-semibold " + (email === k ? "text-[color:var(--ink)]" : "text-[color:var(--ink-2)]")}>{L.kinds[k]}</span>
                {ready[`email:${k}`] && <span className="h-1 w-1 rounded-full bg-[var(--kept)]" aria-hidden />}
              </span>
              <span className="mt-[var(--s-2)] block font-sans text-[length:var(--ui-12)] leading-[var(--ui-12-lh)] text-[color:var(--ink-muted)]">{L.kindHint[k]}</span>
              {email === k && <span aria-hidden className="mt-[var(--s-3)] block h-[2px] w-[28px] bg-[var(--ink)]" />}
            </button>
          </li>
        ))}
      </ul>
      {busy?.startsWith("email:") ? (
        <p className="mt-4 text-sm font-medium text-ink-2" data-testid="email-busy">{L.writing}</p>
      ) : mail && (
        <div className="sheet mt-[var(--s-4)] p-[var(--s-6)] sm:p-[var(--s-8)]" data-testid="email" data-kind={email ?? ""}>
          <p className="eyebrow">{L.subject}</p>
          <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink)]" data-testid="email-subject">{mail.subject}</p>
          <p className="doc-15 mt-[var(--s-5)] max-w-[var(--measure)] whitespace-pre-line text-[color:var(--ink)]" data-testid="email-body">{mail.body}</p>
          <div className="mt-[var(--s-5)] flex flex-wrap items-center gap-[var(--s-3)] border-t border-[var(--rule-hairline)] pt-[var(--s-4)]">
            <Button variant="outline" size="sm" icon="copy" onClick={() => void copy("email", `${mail.subject}\n\n${mail.body}`)} data-testid="email-copy">{copied === "email" ? L.copied : L.copy}</Button>
            <Button size="sm" href={mailto} data-testid="email-mailto">{L.openMail}</Button>
            {mail.cached && <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]" data-testid="email-cached">{L.cached}</span>}
          </div>
        </div>
      )}
      {(letter || mail) && <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{L.placeholders}</p>}
      {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span role="alert" data-testid="letters-error">{error}</span></Notice>}
    </div>
  );
}
