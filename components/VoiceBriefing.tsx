"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { speechAvailable, useSpeechInput } from "@/lib/client/speech";
import type { Briefing } from "@/lib/ai/voice";

/**
 * The listening flow. The user talks; each finished turn goes to the server, which says what it
 * understood and what single thing to ask next. It loops until nothing required is missing, then
 * hands a confirmed briefing to the form. The prompts are read by the server's AI voice; the
 * microphone goes through the shared speech hook (which keeps the words across Chrome's pauses),
 * and its test hook (`window.__rtVoiceFeed`) lets Playwright inject transcripts.
 */
export function VoiceBriefing({ onConfirm, onTypeInstead }: { onConfirm: (b: Briefing, briefingId: string) => void; onTypeInstead: () => void }) {
  const { x, lang, l } = useI18n();
  const [supported, setSupported] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [turns, setTurns] = useState<string[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingId, setBriefingId] = useState<string | undefined>();
  // null until the model asks something: the opener must follow the language switch, so it is derived at render.
  const [followUp, setFollowUp] = useState<string | null>(null);
  const prompt = followUp ?? x.voice.opener;
  const [error, setError] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(speechAvailable()));
    return () => cancelAnimationFrame(id);
  }, []);

  // The AI voice comes from the server (ElevenLabs / OpenAI TTS). Never the browser's own
  // synthesiser: if no provider is configured the prompt is shown, not spoken.
  const audio = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  useEffect(() => {
    let id = 0;
    fetch("/api/voice/speak").then((r) => r.json()).then((j) => { id = requestAnimationFrame(() => setVoiceOn(!!j.provider)); }).catch(() => {});
    return () => cancelAnimationFrame(id);
  }, []);
  const hush = useCallback(() => { try { audio.current?.pause(); } catch {} audio.current = null; }, []);
  const speak = useCallback(async (text: string) => {
    hush();
    try {
      const r = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (r.status !== 200) return;
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url); audio.current = a;
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch { /* autoplay blocked or no audio: the text is on screen */ }
  }, [hush, lang]);
  const opener = x.voice.opener;
  useEffect(() => hush, [hush]);
  // The opener is spoken once the voice is known to be on, and again if the language changes before the first answer.
  useEffect(() => { if (voiceOn && !followUp) void speak(opener); }, [voiceOn, followUp, opener, speak]);

  // Latest state for the turn handler, which the speech hook calls from its own callback.
  const latest = useRef({ briefingId, briefing, lang });
  useEffect(() => { latest.current = { briefingId, briefing, lang }; }, [briefingId, briefing, lang]);

  const finishTurn = useCallback(async (spoken: string) => {
    const text = spoken.trim();
    if (text.length < 3) return;
    const cur = latest.current;
    setTurns((t) => [...t, text]);
    setThinking(true);
    try {
      const r = await fetch("/api/voice/extract", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, lang: cur.lang, briefingId: cur.briefingId, priorSummary: cur.briefing?.summaryForUser }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(apiErrorText(j, l, x.errors.generic));
      setBriefing(j.briefing); setBriefingId(j.briefingId);
      if (j.briefing.missing.length && j.briefing.followUp) { setFollowUp(j.briefing.followUp); void speak(j.briefing.followUp); }
      else void speak(x.voice.ready);
    } catch (e) { setError(e instanceof Error ? e.message : x.errors.generic); }
    finally { setThinking(false); }
  }, [l, x, speak]);

  const speech = useSpeechInput(lang, (t) => { void finishTurn(t); });
  const phase: "idle" | "listening" | "thinking" | "review" = thinking ? "thinking" : speech.listening ? "listening" : briefing ? "review" : "idle";
  const micError = speech.error === "denied" ? x.voice.denied : speech.error === "unsupported" ? x.voice.unsupported : "";

  function start() {
    setError(""); hush();
    speech.start();
  }
  const finish = () => speech.stop();

  const complete = !!briefing && briefing.missing.length === 0 && briefing.mode !== "unknown";

  if (!supported) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-2">{x.voice.unsupported}</p>
        <button className="btn btn-ink mt-4" onClick={onTypeInstead}>{x.voice.typeInstead}</button>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8" data-testid="voice">
      <p className="eyebrow">{x.choose.talk.t}</p>
      <h2 className="font-display mt-1 text-3xl text-ink">{x.voice.title}</h2>
      <p className="mt-1 text-sm text-muted">{x.voice.subtitle}</p>

      <div className="mt-6 rounded-xl border border-edge bg-paper p-5">
        <p className="text-[15px] leading-relaxed text-ink" data-testid="voice-prompt">“{prompt}”</p>
        <div className="mt-3 flex items-center gap-3">
          {voiceOn && <button type="button" onClick={() => void speak(prompt)} className="text-xs font-semibold text-oxblood underline-offset-4 hover:underline" data-testid="voice-replay">▶ {x.voice.listenPrompt}</button>}
          {!voiceOn && <span className="text-xs text-muted">{x.voice.textOnly}</span>}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        {phase === "listening" ? (
          <>
            <button onClick={finish} className="pulse relative grid h-20 w-20 place-items-center rounded-full bg-oxblood text-white" aria-label={x.voice.stop} data-testid="voice-stop">
              <span className="text-2xl">■</span>
            </button>
            <p className="text-sm font-medium text-oxblood">{x.voice.listening}</p>
            <p className="min-h-6 max-w-lg text-center text-sm text-muted" aria-live="polite">{speech.interim}</p>
            <button onClick={finish} className="btn btn-ink">{x.voice.stop}</button>
          </>
        ) : phase === "thinking" ? (
          <p className="text-sm font-medium text-ink-2" data-testid="voice-thinking">{x.voice.thinking}</p>
        ) : (
          <button onClick={start} className="btn btn-primary" data-testid="voice-start">{phase === "review" ? x.voice.again : x.voice.start}</button>
        )}
        {(error || micError) && <p className="text-sm text-oxblood" role="alert">{error || micError}</p>}
      </div>

      {briefing && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2" data-testid="voice-review">
          <div>
            <p className="eyebrow">{x.voice.heard}</p>
            <ul className="mt-2 space-y-2 text-sm text-ink-2">{turns.map((t, i) => <li key={i} className="rounded-lg bg-paper px-3 py-2">“{t}”</li>)}</ul>
          </div>
          <div>
            <p className="eyebrow">{x.voice.understood}</p>
            <p className="mt-2 text-sm text-ink">{briefing.summaryForUser}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row k={x.voice.fields.mode} v={x.voice.modeLabel[briefing.mode]} />
              <Row k={x.voice.fields.targetRole} v={briefing.targetRole} />
              <Row k={x.voice.fields.level} v={x.voice.levelLabel[briefing.level]} />
              <Row k={x.voice.fields.education} v={briefing.education} />
              <Row k={x.voice.fields.experience} v={briefing.experience} />
              <Row k={x.voice.fields.skills} v={briefing.skills} />
              <Row k={x.voice.fields.achievements} v={briefing.achievements} />
            </dl>
            {briefing.missing.length > 0 && <p className="mt-3 text-sm text-oxblood">{x.voice.missing}: {briefing.missing.join(", ")}</p>}
            {complete && <p className="mt-3 text-sm font-medium text-moss">{x.voice.ready}</p>}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-5">
        <button onClick={onTypeInstead} className="text-sm text-muted hover:text-ink">{x.voice.typeInstead}</button>
        {briefing && <button className="btn btn-primary" disabled={!complete || !briefingId} onClick={() => onConfirm(briefing, briefingId!)} data-testid="voice-confirm">{x.voice.useIt}</button>}
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => v ? (
  <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
) : null;
