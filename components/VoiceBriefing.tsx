"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Briefing } from "@/lib/ai/voice";

/* Web Speech API is not in the TS lib; only what we touch is declared. */
type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type RecCtor = new () => Rec;
const getRec = (): RecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const BCP: Record<string, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

/**
 * The listening flow. The user talks; each finished turn goes to the server, which says what it
 * understood and what single thing to ask next. It loops until nothing required is missing, then
 * hands a confirmed briefing to the form. Speech synthesis reads the prompts so eyes stay off the
 * screen; a test hook (`window.__rtVoiceFeed`) lets Playwright inject transcripts.
 */
export function VoiceBriefing({ onConfirm, onTypeInstead }: { onConfirm: (b: Briefing, briefingId: string) => void; onTypeInstead: () => void }) {
  const { x, lang } = useI18n();
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "review">("idle");
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<string[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingId, setBriefingId] = useState<string | undefined>();
  // null until the model asks something: the opener must follow the language switch, so it is derived at render.
  const [followUp, setFollowUp] = useState<string | null>(null);
  const prompt = followUp ?? x.voice.opener;
  const [error, setError] = useState("");
  const rec = useRef<Rec | null>(null);
  const buffer = useRef("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(!!getRec() || !!(window as unknown as { __rtVoiceTest?: boolean }).__rtVoiceTest));
    return () => cancelAnimationFrame(id);
  }, []);

  // The AI voice comes from the server (ElevenLabs / OpenAI TTS). Never the browser's own
  // synthesiser: if no provider is configured the prompt is shown, not spoken.
  const audio = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  useEffect(() => {
    fetch("/api/voice/speak").then((r) => r.json()).then((j) => { const id = requestAnimationFrame(() => setVoiceOn(!!j.provider)); return () => cancelAnimationFrame(id); }).catch(() => {});
  }, []);
  const hush = () => { try { audio.current?.pause(); } catch {} audio.current = null; };
  useEffect(() => { if (voiceOn && !followUp) void speak(x.voice.opener); return hush; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [voiceOn, lang]);
  const speak = async (text: string) => {
    hush();
    try {
      const r = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (r.status !== 200) return;
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url); audio.current = a;
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch { /* autoplay blocked or no audio: the text is on screen */ }
  };

  useEffect(() => {
    // test hook: Playwright feeds a transcript instead of the microphone
    (window as unknown as { __rtVoiceFeed?: (t: string) => void }).__rtVoiceFeed = (t: string) => { buffer.current = t; void finishTurn(); };
    return () => { delete (window as unknown as { __rtVoiceFeed?: unknown }).__rtVoiceFeed; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingId, briefing, turns, lang]);

  function start() {
    setError(""); hush();
    const Ctor = getRec();
    if (!Ctor) { setPhase("listening"); return; }   // test mode: wait for feed
    const r = new Ctor(); rec.current = r;
    r.lang = BCP[lang] ?? "en-US"; r.continuous = true; r.interimResults = true;
    buffer.current = "";
    r.onresult = (e) => {
      let finals = "", live = "";
      for (let i = 0; i < e.results.length; i++) { const res = e.results[i]; const t = res[0]?.transcript ?? ""; if (res.isFinal) finals += t + " "; else live += t; }
      buffer.current = finals.trim(); setInterim(live);
    };
    r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { setError(x.voice.denied); setPhase("idle"); } };
    r.onend = () => { if (phase === "listening") { /* Chrome ends after silence; keep the turn open */ try { r.start(); } catch {} } };
    try { r.start(); setPhase("listening"); } catch { setError(x.voice.unsupported); }
  }

  async function finishTurn() {
    if (rec.current) rec.current.onend = null;
    try { rec.current?.stop(); } catch {}
    const text = (buffer.current + " " + interim).trim();
    setInterim("");
    if (text.length < 3) { setPhase("idle"); return; }
    setTurns((t) => [...t, text]);
    setPhase("thinking");
    try {
      const r = await fetch("/api/voice/extract", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, lang, briefingId, priorSummary: briefing?.summaryForUser }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || x.errors.generic);
      setBriefing(j.briefing); setBriefingId(j.briefingId);
      if (j.briefing.missing.length && j.briefing.followUp) { setFollowUp(j.briefing.followUp); void speak(j.briefing.followUp); }
      else void speak(x.voice.ready);
      setPhase("review");
    } catch (e) { setError(e instanceof Error ? e.message : x.errors.generic); setPhase("idle"); }
  }

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
            <button onClick={finishTurn} className="pulse relative grid h-20 w-20 place-items-center rounded-full bg-oxblood text-white" aria-label={x.voice.stop} data-testid="voice-stop">
              <span className="text-2xl">■</span>
            </button>
            <p className="text-sm font-medium text-oxblood">{x.voice.listening}</p>
            <p className="min-h-6 max-w-lg text-center text-sm text-muted" aria-live="polite">{(buffer.current + " " + interim).trim()}</p>
            <button onClick={finishTurn} className="btn btn-ink">{x.voice.stop}</button>
          </>
        ) : phase === "thinking" ? (
          <p className="text-sm font-medium text-ink-2" data-testid="voice-thinking">{x.voice.thinking}</p>
        ) : (
          <button onClick={start} className="btn btn-primary" data-testid="voice-start">{phase === "review" ? x.voice.again : x.voice.start}</button>
        )}
        {error && <p className="text-sm text-oxblood" role="alert">{error}</p>}
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
