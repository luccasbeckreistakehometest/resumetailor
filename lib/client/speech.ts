"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTranscript } from "@/lib/client/transcript";

/* Web Speech API is not in the TS lib; only what we touch is declared. */
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
type RecCtor = new () => Rec;
const getRec = (): RecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const BCP: Record<string, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export type SpeechError = "" | "denied" | "unsupported";

const testMode = () => typeof window !== "undefined" && !!(window as unknown as { __rtVoiceTest?: boolean }).__rtVoiceTest;

/** True when the browser can listen, or when Playwright will feed transcripts through `window.__rtVoiceFeed`. */
export const speechAvailable = () => !!getRec() || testMode();

/**
 * One spoken turn at a time, shared by the voice briefing and the mock interview: `start()` opens
 * the microphone, `stop()` closes it and hands the whole transcript to `onFinal`. Chrome's
 * automatic stops after a pause are restarted and the words heard so far are kept. The e2e hook
 * `window.__rtVoiceFeed` injects a transcript instead of talking.
 */
export function useSpeechInput(lang: string, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<SpeechError>("");
  const rec = useRef<Rec | null>(null);
  const said = useRef(createTranscript());
  const active = useRef(false);
  const final = useRef(onFinal);
  useEffect(() => { final.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => {
    active.current = false;
    if (rec.current) rec.current.onend = null;
    try { rec.current?.stop(); } catch {}
    rec.current = null;
    const text = said.current.text();
    said.current.reset();
    setInterim(""); setListening(false);
    final.current(text);
  }, []);

  /** Opens the microphone; false when the browser cannot listen (the caller offers typing instead). */
  const start = useCallback((): boolean => {
    setError("");
    said.current.reset();
    const Ctor = testMode() ? null : getRec();
    if (!Ctor) {
      if (speechAvailable()) { active.current = true; setListening(true); return true; }   // test mode: wait for the feed
      setError("unsupported"); return false;
    }
    const r = new Ctor(); rec.current = r;
    r.lang = BCP[lang] ?? "en-US"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let finals = "", partial = "";
      for (let i = 0; i < e.results.length; i++) { const res = e.results[i]; const t = res[0]?.transcript ?? ""; if (res.isFinal) finals += t + " "; else partial += t; }
      said.current.result(finals, partial);
      setInterim(said.current.partial());
    };
    r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { setError("denied"); active.current = false; setListening(false); } };
    // Chrome closes the recogniser after a pause; the turn stays open until the person says they are done.
    r.onend = () => {
      if (!active.current) return;
      said.current.restart();
      try { r.start(); } catch { /* already restarting */ }
    };
    try { r.start(); active.current = true; setListening(true); return true; } catch { setError("unsupported"); return false; }
  }, [lang]);

  useEffect(() => {
    (window as unknown as { __rtVoiceFeed?: (t: string) => void }).__rtVoiceFeed = (t: string) => { said.current.set(t); stop(); };
    return () => { delete (window as unknown as { __rtVoiceFeed?: unknown }).__rtVoiceFeed; };
  }, [stop]);

  useEffect(() => () => { active.current = false; try { rec.current?.abort(); } catch {} }, []);

  return { listening, interim, error, start, stop };
}
