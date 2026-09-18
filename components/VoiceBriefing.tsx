"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { speechAvailable, useSpeechInput } from "@/lib/client/speech";
import { DEFAULT_TURNS, countWords, initialTurns, stepTurns, type TurnEffect, type TurnEvent, type TurnPhase } from "@/lib/voice/turns";
import type { Briefing } from "@/lib/ai/voice";
import type { ProfileFacts } from "@/lib/profile/facts";
import type { Extra } from "@/app/i18n/extra";
import type { Round3 } from "@/app/i18n/round3";
import { Icon } from "@/components/ui";

/**
 * The listening flow, hands-free. The AI voice (server TTS — never the browser's synthesiser)
 * asks; when it stops, the microphone opens by itself; a short pause after a few words ends the
 * turn; the server says what it understood and what to ask next. Turn-taking is the pure state
 * machine in lib/voice/turns.ts. Controls stay visible: pause, "I'm done", "I'd rather type".
 * Test hooks: `window.__rtVoiceFeed` (a whole turn) and `window.__rtVoiceHear` (words, turn open).
 */
export function VoiceBriefing({ onConfirm, onTypeInstead }: { onConfirm: (b: Briefing, briefingId: string, facts: ProfileFacts | null) => void; onTypeInstead: () => void }) {
  const { x, r, lang, l } = useI18n();
  const V = r.voice;
  const [supported, setSupported] = useState(true);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<TurnPhase>("idle");
  const [turns, setTurns] = useState<string[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingId, setBriefingId] = useState<string | undefined>();
  const [facts, setFacts] = useState<ProfileFacts | null>(null);
  // null until the model asks something: the opener must follow the language switch, so it is derived at render.
  const [followUp, setFollowUp] = useState<string | null>(null);
  const prompt = followUp ?? x.voice.opener;
  const [error, setError] = useState("");
  const [silentMisses, setSilentMisses] = useState(0);
  const [optionalAsk, setOptionalAsk] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(speechAvailable()));
    return () => cancelAnimationFrame(id);
  }, []);

  const audio = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  useEffect(() => {
    let id = 0;
    fetch("/api/voice/speak").then((res) => res.json()).then((j) => { id = requestAnimationFrame(() => setVoiceOn(!!j.provider)); }).catch(() => {});
    return () => cancelAnimationFrame(id);
  }, []);
  const hush = useCallback(() => { try { audio.current?.pause(); } catch {} audio.current = null; }, []);

  // The state machine lives in a ref (it is driven from callbacks and a timer); `phase` mirrors it for rendering.
  const machine = useRef(initialTurns());
  const effectsRef = useRef<(e: TurnEffect[]) => void>(() => {});
  const send = useCallback((ev: TurnEvent) => {
    const next = stepTurns(machine.current, ev, DEFAULT_TURNS);
    machine.current = next.state;
    setPhase(next.state.phase);
    effectsRef.current(next.effects);
  }, []);

  /** Speaks a prompt through the server voice; without one (or if playback is blocked) the text is enough. */
  const say = useCallback(async (text: string) => {
    hush();
    if (!voiceOn) { send({ type: "prompt", at: Date.now(), tts: false }); return; }
    send({ type: "prompt", at: Date.now(), tts: true });
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (res.status !== 200) throw new Error("no audio");
      const url = URL.createObjectURL(await res.blob());
      const a = new Audio(url); audio.current = a;
      a.onended = () => { URL.revokeObjectURL(url); if (audio.current === a) { audio.current = null; send({ type: "audioEnded", at: Date.now() }); } };
      await a.play();
    } catch {
      // Autoplay blocked or no audio: the prompt is on screen; listening opens after the short delay.
      send({ type: "prompt", at: Date.now(), tts: false });
    }
  }, [hush, voiceOn, lang, send]);
  useEffect(() => hush, [hush]);

  /** "I have what I need" is spoken but does not reopen the microphone. */
  const speakOnly = useCallback(async (text: string) => {
    if (!voiceOn) return;
    try {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (res.status !== 200) return;
      const a = new Audio(URL.createObjectURL(await res.blob())); audio.current = a;
      await a.play();
    } catch { /* text is on screen */ }
  }, [voiceOn, lang]);

  const latest = useRef({ briefingId, briefing, lang });
  useEffect(() => { latest.current = { briefingId, briefing, lang }; }, [briefingId, briefing, lang]);

  const finishTurn = useCallback(async (spoken: string) => {
    const text = spoken.trim();
    if (text.length < 3) { send({ type: "prompt", at: Date.now(), tts: false }); return; }
    const cur = latest.current;
    send({ type: "sent" });
    setTurns((t) => [...t, text]);
    try {
      const res = await fetch("/api/voice/extract", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, lang: cur.lang, briefingId: cur.briefingId, priorSummary: cur.briefing?.summaryForUser }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorText(j, l, x.errors.generic));
        machine.current = { ...machine.current, phase: "idle" }; setPhase("idle");
        return;
      }
      const b = j.briefing as Briefing;
      setBriefing(b); setBriefingId(j.briefingId); setFacts(j.facts ?? null);
      const done = b.missing.length === 0 && b.mode !== "unknown";
      setOptionalAsk(done && !!b.followUp);
      if (b.followUp) { setFollowUp(b.followUp); void say(b.followUp); }
      else { setFollowUp(x.voice.ready); machine.current = { ...machine.current, phase: "idle" }; setPhase("idle"); void speakOnly(x.voice.ready); }
    } catch {
      setError(x.errors.generic);
      machine.current = { ...machine.current, phase: "idle" }; setPhase("idle");
    }
  }, [l, x, say, send, speakOnly]);

  const speech = useSpeechInput(lang, (t) => { void finishTurn(t); }, {
    onHeard: (t) => send({ type: "result", at: Date.now(), words: countWords(t) }),
    onNoSpeech: () => setSilentMisses((n) => n + 1),
  });

  useEffect(() => {
    effectsRef.current = (effects) => {
      for (const e of effects) {
        if (e === "startMic") { setError(""); speech.start(); }
        else if (e === "stopMic") speech.cancel();
        else if (e === "pauseAudio") hush();
        else if (e === "endTurn") speech.stop();
      }
    };
  });

  // The clock that turns silence into an end of turn and opens the mic after a silent prompt.
  useEffect(() => {
    if (phase !== "listening" && phase !== "waiting") return;
    const id = window.setInterval(() => send({ type: "tick", at: Date.now() }), 250);
    return () => window.clearInterval(id);
  }, [phase, send]);

  function begin() {
    setError(""); setSilentMisses(0);
    // The first tap speaks the question (a user gesture lets audio play); "add more" just opens the mic.
    if (!started) { setStarted(true); void say(prompt); }
    else send({ type: "prompt", at: Date.now(), tts: false });
  }
  const talkNow = () => { hush(); send({ type: "audioEnded", at: Date.now() }); };
  const micError = speech.error === "denied" ? x.voice.denied : speech.error === "unsupported" ? x.voice.unsupported : "";
  const complete = !!briefing && briefing.missing.length === 0 && briefing.mode !== "unknown";

  if (!supported) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-2">{x.voice.unsupported}</p>
        <button className="btn btn-ink mt-4" onClick={onTypeInstead}>{x.voice.typeInstead}</button>
      </div>
    );
  }

  return <VoiceView {...{ x, V, prompt, voiceOn, started, phase, speech, briefing, turns, complete, optionalAsk, error, micError, silentMisses, briefingId, facts }}
    onBegin={begin} onReplay={() => void say(prompt)} onTalkNow={talkNow} onPause={() => send({ type: "pause" })} onResume={() => send({ type: "resume", at: Date.now() })}
    onDone={() => send({ type: "stop" })} onTypeInstead={() => { speech.cancel(); hush(); onTypeInstead(); }}
    onConfirm={() => { speech.cancel(); hush(); onConfirm(briefing!, briefingId!, facts); }} />;
}

type ViewProps = {
  x: Extra; V: Round3["voice"]; prompt: string; voiceOn: boolean; started: boolean; phase: TurnPhase;
  speech: { listening: boolean; interim: string }; briefing: Briefing | null; turns: string[]; complete: boolean; optionalAsk: boolean;
  error: string; micError: string; silentMisses: number; briefingId?: string; facts: ProfileFacts | null;
  onBegin: () => void; onReplay: () => void; onTalkNow: () => void; onPause: () => void; onResume: () => void;
  onDone: () => void; onTypeInstead: () => void; onConfirm: () => void;
};

function VoiceView(p: ViewProps) {
  const { x, V, phase } = p;
  const label = phase === "listening" ? (p.speech.interim ? V.listening : V.canSpeak) : phase === "thinking" ? V.thinking : phase === "speaking" ? V.speaking : phase === "paused" ? V.paused : "";
  const live = phase === "listening" || phase === "speaking" || phase === "waiting";
  return (
    <div className="card p-6 sm:p-8" data-testid="voice" data-phase={phase}>
      <p className="eyebrow">{x.choose.talk.t}</p>
      <h2 className="font-display mt-1 text-3xl text-ink">{x.voice.title}</h2>
      <p className="mt-1 text-sm text-muted">{x.voice.subtitle}</p>

      <div className="mt-6 rounded-xl border border-edge bg-paper p-5">
        <p className="text-[15px] leading-relaxed text-ink" data-testid="voice-prompt">“{p.prompt}”</p>
        {p.optionalAsk && <p className="mt-1 text-xs text-muted">{V.optional}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {p.voiceOn && <button type="button" onClick={p.onReplay} className="text-xs font-semibold text-[color:var(--ink)] underline-offset-4 hover:underline" data-testid="voice-replay">{x.voice.listenPrompt}</button>}
          {!p.voiceOn && <span className="text-xs text-muted">{x.voice.textOnly}</span>}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!p.started || (phase === "idle" && !live) ? (
          <button onClick={p.onBegin} className="btn btn-primary" data-testid="voice-start">{p.briefing ? x.voice.again : x.voice.start}</button>
        ) : (
          <>
            <div className={"relative grid h-20 w-20 place-items-center rounded-full " + (phase === "listening" ? "pulse bg-[var(--mark)] text-[color:var(--on-mark)]" : phase === "thinking" ? "bg-[var(--query-wash)] text-[color:var(--ink)]" : "bg-[var(--sunken)] text-[color:var(--ink)]")} aria-hidden>
              <Icon name={phase === "listening" ? "mic" : phase === "paused" ? "play" : "play"} />
            </div>
            <p className="text-sm font-medium text-[color:var(--ink-2)]" role="status" data-testid={phase === "thinking" ? "voice-thinking" : "voice-status"}>{label}</p>
            {phase === "listening" && <p className="min-h-6 max-w-lg text-center text-sm text-muted" aria-live="polite">{p.speech.interim || V.autoHint}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              {phase === "listening" && <button onClick={p.onDone} className="btn btn-ink" data-testid="voice-stop">{V.done}</button>}
              {phase === "speaking" && <button onClick={p.onTalkNow} className="btn btn-ink" data-testid="voice-talk-now">{V.talkNow}</button>}
              {phase === "paused" ? <button onClick={p.onResume} className="btn btn-primary" data-testid="voice-resume">{V.resume}</button>
                : live && <button onClick={p.onPause} className="btn btn-ghost" data-testid="voice-pause">⏸ {V.pause}</button>}
            </div>
          </>
        )}
        {p.silentMisses >= 2 && <p className="text-sm text-muted">{V.noSpeech}</p>}
        {(p.error || p.micError) && <p className="text-sm text-oxblood" role="alert">{p.error || p.micError}</p>}
      </div>

      {p.briefing && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2" data-testid="voice-review">
          <div>
            <p className="eyebrow">{x.voice.heard}</p>
            <ul className="mt-2 space-y-2 text-sm text-ink-2">{p.turns.map((t, i) => <li key={i} className="rounded-lg bg-paper px-3 py-2">“{t}”</li>)}</ul>
          </div>
          <div>
            <p className="eyebrow">{x.voice.understood}</p>
            <p className="mt-2 text-sm text-ink">{p.briefing.summaryForUser}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row k={x.voice.fields.mode} v={x.voice.modeLabel[p.briefing.mode]} />
              <Row k={x.voice.fields.targetRole} v={p.briefing.targetRole} />
              <Row k={x.voice.fields.level} v={x.voice.levelLabel[p.briefing.level]} />
              <Row k={x.voice.fields.education} v={p.briefing.education} />
              <Row k={x.voice.fields.experience} v={p.briefing.experience} />
              <Row k={x.voice.fields.skills} v={p.briefing.skills} />
              <Row k={x.voice.fields.achievements} v={p.briefing.achievements} />
            </dl>
            {p.briefing.missing.length > 0 && <p className="mt-3 text-sm text-oxblood">{x.voice.missing}: {p.briefing.missing.join(", ")}</p>}
            {p.complete && <p className="mt-3 text-sm font-medium text-moss">{x.voice.ready}</p>}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-5">
        <button onClick={p.onTypeInstead} className="text-sm text-muted hover:text-ink" data-testid="voice-type">{V.typeInstead}</button>
        {p.briefing && <button className="btn btn-primary" disabled={!p.complete || !p.briefingId} onClick={p.onConfirm} data-testid="voice-confirm">{x.voice.useIt}</button>}
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => v ? (
  <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
) : null;
