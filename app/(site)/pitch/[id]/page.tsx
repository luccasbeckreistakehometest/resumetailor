"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { DeliveryLine } from "@/components/DeliveryLine";
import { Container, Eyebrow } from "@/components/ui";
import { useSpeechInput } from "@/lib/client/speech";
import { deliveryMetrics, type Delivery } from "@/lib/speech/metrics";
import type { Pitch, PitchFeedback } from "@/lib/ai/pitch";

type Loaded = { pitch: Pitch | null; source: "template" | "ai" | null; unlocked: boolean; feedbackLeft: number };
type Phase = "idle" | "countdown" | "recording" | "done";
const LENGTHS = [60, 90, 120] as const;

const pickMime = (video: boolean) => {
  if (typeof MediaRecorder === "undefined") return "";
  const list = video ? ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"] : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
};
/** Text for the AI voice in pieces of at most 600 characters, split at sentence ends. */
const chunks = (text: string) => text.match(/[^.!?\n]+[.!?\n]*/g)?.reduce<string[]>((acc, s) => { const last = acc[acc.length - 1]; if (last && (last + s).length <= 600) acc[acc.length - 1] = last + s; else acc.push(s.slice(0, 600)); return acc; }, []) ?? [];

/**
 * /pitch/[id]: script → teleprompter → countdown → record (camera + mic, or mic only, or nothing)
 * → preview and download. The take lives only in this tab as a blob URL; only the transcript and
 * the numbers go to the server, and only when the person asks for a rating.
 */
export default function PitchStudio() {
  const { id } = useParams<{ id: string }>();
  const { r, l, x, lang } = useI18n();
  const P = r.pitch;
  const [seconds, setSeconds] = useState<(typeof LENGTHS)[number]>(60);
  const [data, setData] = useState<Loaded | null>(null);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [mediaNote, setMediaNote] = useState("");
  const [take, setTake] = useState<{ url: string; type: string; size: number } | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<PitchFeedback | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const parts = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const heardAt = useRef<number[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const prompter = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/generations/${id}/pitch?seconds=${seconds}`, { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).then((j: Loaded | null) => {
      if (!alive || !j) return;
      setData(j); setScript(j.pitch?.script ?? "");
    }).catch(() => {});
    fetch("/api/voice/speak").then((res) => res.json()).then((j) => { if (alive) setVoiceOn(!!j.provider); }).catch(() => {});
    return () => { alive = false; };
  }, [id, seconds]);

  const speech = useSpeechInput(lang, (text) => {
    const secs = Math.max(1, (Date.now() - startedAt.current) / 1000);
    setTranscript(text);
    setDelivery(deliveryMetrics(text, secs, lang as "en", heardAt.current));
  }, { onHeard: () => { if (startedAt.current) heardAt.current.push(Date.now() - startedAt.current); } });

  async function writeScript() {
    setBusy(true); setError("");
    const res = await fetch(`/api/generations/${id}/pitch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    setData(j); setScript(j.pitch?.script ?? "");
  }

  async function listen() {
    if (audio.current) { audio.current.pause(); audio.current = null; return; }
    for (const part of chunks(script)) {
      const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: part, lang }) });
      if (res.status !== 200) return;
      const a = new Audio(URL.createObjectURL(await res.blob()));
      audio.current = a;
      await a.play().catch(() => {});
      await new Promise<void>((done) => { a.onended = () => done(); a.onpause = () => done(); });
      if (audio.current !== a) return;
    }
    audio.current = null;
  }

  const stopAll = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => stopAll, [stopAll]);

  async function openMedia(): Promise<MediaStream | null> {
    try { return await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true }); } catch { /* try audio only */ }
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); setMediaNote(P.audioOnly); return s; } catch { setMediaNote(P.noMedia); return null; }
  }

  async function begin(recordIt: boolean) {
    setError(""); setFeedback(null); setDelivery(null); setTranscript("");
    if (take) { URL.revokeObjectURL(take.url); setTake(null); }
    const s = recordIt ? await openMedia() : null;
    stream.current = s;
    if (video.current && s && s.getVideoTracks().length) { video.current.srcObject = s; void video.current.play().catch(() => {}); }
    setPhase("countdown"); setCount(3);
    for (const n of [2, 1, 0]) { await new Promise((ok) => window.setTimeout(ok, 700)); setCount(n); }
    startedAt.current = Date.now(); heardAt.current = [];
    if (s && typeof MediaRecorder !== "undefined") {
      const mime = pickMime(s.getVideoTracks().length > 0);
      const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      parts.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) parts.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(parts.current, { type: rec.mimeType || mime || "video/webm" });
        setTake({ url: URL.createObjectURL(blob), type: blob.type, size: blob.size });
        stopAll();
      };
      rec.start(250);
      recorder.current = rec;
    }
    speech.start();
    setPhase("recording"); setElapsed(0);
  }

  function finish() {
    recorder.current?.stop(); recorder.current = null;
    if (!stream.current) stopAll();
    speech.stop();
    setPhase("done");
  }

  // Stopwatch and teleprompter: the text scrolls at the speed the chosen length implies.
  useEffect(() => {
    if (phase !== "recording") return;
    let raf = 0;
    const tick = () => {
      const secs = (Date.now() - startedAt.current) / 1000;
      const box = prompter.current;
      if (box) box.scrollTop = Math.min(1, secs / seconds) * (box.scrollHeight - box.clientHeight);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => { cancelAnimationFrame(raf); window.clearInterval(id); };
  }, [phase, seconds]);

  async function rate() {
    if (!delivery || transcript.trim().length < 20) { setError(P.feedbackNeedsWords); return; }
    setBusy(true); setError("");
    const res = await fetch(`/api/generations/${id}/pitch/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds: delivery.seconds || 1, transcript, target: seconds, pauses: heardAt.current.slice(-400) }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    setFeedback(j.feedback);
    setData((d) => (d ? { ...d, feedbackLeft: j.feedbackLeft } : d));
  }

  const ext = take?.type.includes("mp4") ? "mp4" : take?.type.startsWith("audio") ? "webm" : "webm";
  const over = elapsed - seconds;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-8)]">
        <Eyebrow>{P.cta}</Eyebrow>
        <h1 className="font-display mt-1 text-4xl text-ink">{P.title}</h1>
        <p className="mt-2 max-w-3xl text-ink-2">{P.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group">
          {LENGTHS.map((n) => <button key={n} type="button" onClick={() => setSeconds(n)} disabled={phase === "recording"} className={"rounded-full border px-3 py-1 text-sm " + (seconds === n ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2")} data-testid={`pitch-len-${n}`}>{P.seconds(n)}</button>)}
          <span className="text-xs text-muted">{P.lengthNote}</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5" data-testid="pitch-script">
            <p className="font-semibold text-ink">{P.script}</p>
            <p className="text-xs text-muted">{P.scriptHint}</p>
            {data && !data.unlocked && <p className="mt-2 rounded-lg bg-gold-2 px-3 py-2 text-sm text-ink" data-testid="pitch-template">{P.templateNote}</p>}
            <textarea aria-label={P.script} className="field mt-3" rows={12} value={script} onChange={(e) => setScript(e.target.value)} data-testid="pitch-text" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {data?.unlocked && data.source !== "ai" && <button type="button" onClick={writeScript} disabled={busy} className="btn btn-primary !py-2 !text-sm" data-testid="pitch-write">{busy ? P.writing : P.writeScript}</button>}
              {voiceOn && script && <button type="button" onClick={() => void listen()} className="text-sm font-semibold text-[color:var(--ink)] underline underline-offset-[3px]">{P.listen}</button>}
              {data && !data.unlocked && <Link href={`/start?gen=${id}`} className="btn btn-primary !py-2 !text-sm" data-testid="pitch-unlock">{x.credits.unlockWith}</Link>}
            </div>
            {data && !data.unlocked && <p className="mt-2 text-xs text-muted">{P.unlock}</p>}
          </section>

          <section className="card p-5" data-testid="pitch-stage">
            <div className="relative overflow-hidden rounded-xl bg-ink">
              <video ref={video} muted playsInline className={"aspect-video w-full object-cover " + (phase === "recording" || phase === "countdown" ? "" : "hidden")} />
              {take && phase === "done" && (take.type.startsWith("audio") ? <audio src={take.url} controls className="w-full" /> : <video src={take.url} controls playsInline className="aspect-video w-full" data-testid="pitch-preview" />)}
              {phase === "countdown" && <p className="absolute inset-0 grid place-items-center font-display text-7xl text-paper" data-testid="pitch-countdown">{count || "●"}</p>}
              <div ref={prompter} className={"max-h-48 overflow-hidden whitespace-pre-line px-4 py-3 font-display text-2xl leading-snug text-paper " + (phase === "recording" ? "absolute inset-x-0 bottom-0 bg-ink/70" : phase === "done" ? "hidden" : "")} data-testid="pitch-prompter">{script || "…"}</div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className={"font-display text-3xl " + (over > 0 ? "text-oxblood" : "text-ink")} data-testid="pitch-clock">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}<span className="ml-2 text-sm text-muted">/ {seconds}s{over > 0 ? ` · ${P.over(over)}` : ""}</span></p>
              {phase === "recording" ? <button type="button" onClick={finish} className="btn btn-primary ml-auto" data-testid="pitch-stop">■ {P.stop}</button> : (
                <div className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => void begin(true)} disabled={phase === "countdown" || !script} className="btn btn-primary" data-testid="pitch-record">● {take ? P.retake : P.record}</button>
                  <button type="button" onClick={() => void begin(false)} disabled={phase === "countdown" || !script} className="btn btn-ghost !text-sm">{P.rehearseOnly}</button>
                </div>
              )}
            </div>
            {mediaNote && <p className="mt-2 text-sm text-muted">{mediaNote}</p>}
            {take && phase === "done" && (
              <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
                <a href={take.url} download={`pitch-${seconds}s.${ext}`} className="font-semibold text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]" data-testid="pitch-download" data-size={take.size} data-type={take.type}>⬇ {P.download}</a>
                <p className="mt-1 text-xs text-muted">{P.localOnly}</p>
              </div>
            )}
            {delivery && phase === "done" && <DeliveryLine d={delivery} />}
            {phase === "done" && data?.unlocked && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={rate} disabled={busy || data.feedbackLeft === 0} className="btn btn-ink !py-2 !text-sm" data-testid="pitch-rate">{busy ? P.feedbackWorking : P.feedback}</button>
                <span className="text-xs text-muted" data-testid="pitch-left">{P.feedbackLeft(data.feedbackLeft)}</span>
              </div>
            )}
            {feedback && (
              <div className="mt-3 rounded-xl border border-edge p-3 text-sm" data-testid="pitch-feedback">
                <p className="font-display text-3xl text-ink">{feedback.score}<span className="text-sm text-muted">/10</span></p>
                <p><strong>{P.hook}:</strong> {feedback.hook}</p>
                <p><strong>{P.evidence}:</strong> {feedback.evidence}</p>
                <p><strong>{P.close}:</strong> {feedback.close}</p>
                <p className="mt-1 text-oxblood"><strong>{P.oneFix}:</strong> {feedback.oneFix}</p>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
          </section>
        </div>
      </Container>
    </div>
  );
}
