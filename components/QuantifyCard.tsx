"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { speechAvailable, useSpeechInput } from "@/lib/client/speech";
import type { GenerationView } from "@/lib/server/generations";

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
    return gen.quantify.count > 0 ? <p className="text-sm text-ink-2" data-testid="quantify-teaser">🔢 {Q.lockedTeaser(gen.quantify.count)}</p> : null;
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
    <section className="rounded-2xl border border-gold bg-gold-2/40 p-5" data-testid="quantify">
      <p className="font-display text-xl text-ink">🔢 {Q.title}</p>
      <p className="mt-1 text-sm text-ink-2">{Q.intro}</p>
      {used && !note ? <p className="mt-3 text-sm text-muted" data-testid="quantify-used">{Q.used}</p> : (
        <ol className="mt-4 space-y-3">
          {asks.map((a, i) => (
            <li key={i} className="rounded-xl bg-surface p-3" data-testid="quantify-ask">
              <p className="text-sm font-medium text-ink">{a.question}</p>
              <p className="mt-0.5 text-xs text-muted">“{a.bullet}”</p>
              <div className={"mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_auto] " + (answers[i]?.skip ? "opacity-40" : "")}>
                <input aria-label={Q.value} placeholder={a.unitHint || Q.value} inputMode="decimal" className="field !py-1.5" value={answers[i]?.value ?? ""} disabled={answers[i]?.skip || busy} onChange={(e) => set(i, { value: e.target.value })} data-testid="quantify-value" />
                <input aria-label={Q.context} placeholder={Q.context} className="field !py-1.5" value={answers[i]?.context ?? ""} disabled={answers[i]?.skip || busy} onChange={(e) => set(i, { context: e.target.value })} data-testid="quantify-context" />
                {speechAvailable() && (
                  <button type="button" disabled={busy || answers[i]?.skip} onClick={() => { if (speech.listening) { speech.stop(); return; } setVoiceFor(i); speech.start(); }}
                    className="rounded-full border border-edge-2 px-3 py-1.5 text-xs font-semibold text-ink" data-testid="quantify-mic">{speech.listening && voiceFor === i ? `■ ${Q.listening}` : `🎙 ${Q.speak}`}</button>
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
                <input type="checkbox" checked={answers[i]?.skip ?? false} onChange={(e) => set(i, { skip: e.target.checked })} data-testid="quantify-skip" />{Q.dontKnow}
              </label>
            </li>
          ))}
        </ol>
      )}
      {!used && <button type="button" onClick={submit} disabled={busy} className="btn btn-primary mt-4" data-testid="quantify-submit">{busy ? Q.working : Q.submit}</button>}
      {note && <p className="mt-3 text-sm text-moss" role="status" data-testid="quantify-done">{note}</p>}
      {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
    </section>
  );
}
