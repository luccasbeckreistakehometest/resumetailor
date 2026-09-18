"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { speechAvailable, useSpeechInput } from "@/lib/client/speech";
import type { GenerationView } from "@/lib/server/generations";
import { Button, Checkbox, Icon, Input, Notice } from "@/components/ui";

type Answer = { value: string; context: string; skip: boolean };

/** The first figure in a spoken answer ("uns 25 por dia" → "25", "por dia"). */
function splitSpoken(text: string): { value: string; context: string } {
  const m = text.match(/(R\$|US\$|\$)?\s?\d+(?:[.,]\d+)?\s?(%|mil|k|mi)?/i);
  if (!m) return { value: "", context: text.trim() };
  return { value: m[0].trim(), context: text.replace(m[0], "").replace(/\s+/g, " ").trim() };
}

/**
 * "Faltou número? Ele pergunta.": the kit's questions for bullets without figures. Answers by
 * typing or by voice (the shared speech hook); "I don't know" answers are never sent.
 */
export function QuantifyCard({ gen, onUpdate }: { gen: GenerationView; onUpdate: (g: GenerationView) => void }) {
  const { r, l, x, lang } = useI18n();
  const Q = r.quantify;
  const asks = gen.quantify.asks ?? [];
  const [answers, setAnswers] = useState<Answer[]>(() => asks.map(() => ({ value: "", context: "", skip: false })));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [voiceFor, setVoiceFor] = useState<number | null>(null);
  const set = (i: number, patch: Partial<Answer>) => setAnswers((cur) => cur.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const speech = useSpeechInput(lang, (text) => {
    if (voiceFor === null || !text.trim()) return;
    set(voiceFor, splitSpoken(text));
    setVoiceFor(null);
  });

  if (!gen.kit) {
    return gen.quantify.count > 0 ? <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]" data-testid="quantify-teaser">{Q.lockedTeaser(gen.quantify.count)}</p> : null;
  }
  if (asks.length === 0) return null;

  async function submit() {
    const payload = answers.map((a, index) => ({ index, value: a.value.trim(), context: a.context.trim(), skip: a.skip }))
      .filter((a) => !a.skip && a.value).map(({ index, value, context }) => ({ index, value, context }));
    if (!payload.length) { setError(Q.answerOne); return; }
    setBusy(true); setError(""); setNote("");
    const res = await fetch(`/api/generations/${gen.id}/quantify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(res.status === 429 ? Q.used : apiErrorText(j, l, x.errors.generic)); return; }
    setNote(Q.done(j.applied ?? 0));
    onUpdate(j);
  }

  const used = gen.quantify.left === 0;
  return (
    <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="quantify">
      <p className="eyebrow">{Q.title}</p>
      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{Q.intro}</p>
      {used && !note ? (
        <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]" data-testid="quantify-used">{Q.used}</p>
      ) : (
        <ol className="mt-[var(--s-5)] border-t border-[var(--rule-hairline)]">
          {asks.map((a, i) => (
            <li key={i} className="border-b border-[var(--rule-hairline)] py-[var(--s-5)]" data-testid="quantify-ask">
              <p className="font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink)]">{a.question}</p>
              {/* The bullet the question came from, quoted in the document's own voice. */}
              <p className="doc-12 mt-[var(--s-2)] text-[color:var(--ink-muted)]">“{a.bullet}”</p>
              <div className={"mt-[var(--s-4)] grid gap-[var(--s-3)] sm:grid-cols-[7rem_1fr] " + (answers[i]?.skip ? "opacity-50" : "")}>
                <Input aria-label={Q.value} placeholder={a.unitHint || Q.value} inputMode="decimal" value={answers[i]?.value ?? ""} disabled={answers[i]?.skip || busy} onChange={(e) => set(i, { value: e.target.value })} data-testid="quantify-value" />
                <Input aria-label={Q.context} placeholder={Q.context} value={answers[i]?.context ?? ""} disabled={answers[i]?.skip || busy} onChange={(e) => set(i, { context: e.target.value })} data-testid="quantify-context" />
              </div>
              <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-5)]">
                <Checkbox checked={answers[i]?.skip ?? false} onChange={(e) => set(i, { skip: e.target.checked })} data-testid="quantify-skip" label={Q.dontKnow} />
                {speechAvailable() && (
                  <button type="button" disabled={busy || answers[i]?.skip} onClick={() => { if (speech.listening) { speech.stop(); return; } setVoiceFor(i); speech.start(); }}
                    className="inline-flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-2)] hover:text-[color:var(--ink)] disabled:text-[color:var(--ink-40)]" data-testid="quantify-mic">
                    <Icon name="mic" size={16} />{speech.listening && voiceFor === i ? Q.listening : Q.speak}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {!used && <Button className="mt-[var(--s-5)]" size="sm" onClick={submit} loading={busy} data-testid="quantify-submit">{busy ? Q.working : Q.submit}</Button>}
      {note && <Notice tone="kept" icon="check" className="mt-[var(--s-4)]"><span role="status" data-testid="quantify-done">{note}</span></Notice>}
      {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span>{error}</span></Notice>}
    </section>
  );
}
