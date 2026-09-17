"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Eyebrow } from "@/components/ui";
import { speechAvailable, useSpeechInput } from "@/lib/client/speech";
import { DIMENSIONS, MAX_QUESTIONS, overallOf, type Scores } from "@/lib/interview/logic";
import type { SessionView } from "@/lib/server/interviews";
import type { GenerationView } from "@/lib/server/generations";

type Phase = "loading" | "missing" | "intro" | "starting" | "question" | "listening" | "thinking" | "scored" | "summary";
const post = (url: string, body?: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

/**
 * The mock interview. One question at a time, spoken by the AI voice when a provider is
 * configured (never the browser's own), answered by voice or by typing; every answer comes back
 * scored and coached, and the session closes with what to rehearse. The session lives on the
 * server, so a reload with `?session=` resumes where it stopped.
 */
export function InterviewSession({ generationId, initialSessionId }: { generationId: string; initialSessionId: string | null }) {
  const { x, lang } = useI18n();
  const [gen, setGen] = useState<GenerationView | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const initial = useRef(initialSessionId);

  // The kit for the intro; the session when resuming. Read once: the URL is updated in place afterwards.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await fetch(`/api/generations/${generationId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (cancelled) return;
      if (!g) { setPhase("missing"); return; }
      setGen(g);
      const sid = initial.current;
      const s = sid ? await fetch(`/api/interview/${sid}`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
      if (cancelled) return;
      if (!s || s.generationId !== generationId) { setPhase("intro"); return; }
      setSession(s);
      if (s.status === "done") setPhase("summary"); else { setIdx(s.turns.length); setPhase("question"); }
    })();
    const id = requestAnimationFrame(() => setCanListen(speechAvailable()));
    return () => { cancelled = true; cancelAnimationFrame(id); };
  }, [generationId]);

  // The interviewer's voice comes from the server (ElevenLabs / OpenAI TTS); with no provider the question is only shown.
  const audio = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  useEffect(() => {
    let id = 0;
    fetch("/api/voice/speak").then((r) => r.json()).then((j) => { id = requestAnimationFrame(() => setVoiceOn(!!j.provider)); }).catch(() => {});
    return () => cancelAnimationFrame(id);
  }, []);
  const hush = useCallback(() => { try { audio.current?.pause(); } catch {} audio.current = null; }, []);
  const sessionLang = session?.lang ?? lang;
  const speak = useCallback(async (text: string) => {
    hush();
    try {
      const r = await post("/api/voice/speak", { text: text.slice(0, 600), lang: sessionLang });
      if (r.status !== 200) return;
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url); audio.current = a; a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch { /* autoplay blocked or no audio: the question is on screen */ }
  }, [hush, sessionLang]);
  useEffect(() => hush, [hush]);

  const question = session?.questions[idx] ?? null;
  const total = session?.questions.length ?? 0;
  useEffect(() => {
    if (phase !== "question" || !voiceOn || !question) return;
    void speak(question.text);
  }, [phase, voiceOn, question, speak]);

  const submit = useCallback(async (answer: string, source: "voice" | "text") => {
    if (!session) return;
    const text = answer.trim();
    if (text.split(/\s+/).filter(Boolean).length < 4) { setError(x.interview.tooShort); setPhase("question"); return; }
    setError(""); setPhase("thinking"); setShowModel(false); hush();
    const r = await post(`/api/interview/${session.id}/answer`, { questionIdx: idx, answer: text, source });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error || x.errors.generic); setPhase("question"); return; }
    setSession(j); setDraft(""); setTyping(false); setPhase("scored");
  }, [session, idx, x, hush]);

  const speech = useSpeechInput(sessionLang, (t) => { void submit(t, "voice"); });

  async function start() {
    setPhase("starting"); setError("");
    const r = await post("/api/interview", { generationId });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) { setLimit(true); setPhase("intro"); return; }
    if (!r.ok) { setError(j.error || x.errors.generic); setPhase("intro"); return; }
    setSession(j); setIdx(0); setTyping(false); setPhase("question");
    window.history.replaceState(null, "", `/interview/${generationId}?session=${j.id}`);
  }
  function listen() { hush(); setError(""); if (speech.start()) setPhase("listening"); }
  function next() { setIdx(idx + 1); setShowModel(false); setPhase("question"); }
  async function finishEarly() {
    if (!session) return;
    setPhase("thinking"); hush();
    const r = await post(`/api/interview/${session.id}/finish`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error || x.errors.generic); setPhase("question"); return; }
    setSession(j); setPhase("summary");
  }
  function again() { setSession(null); setIdx(0); setError(""); setPhase("intro"); window.history.replaceState(null, "", `/interview/${generationId}`); }

  const preview = !gen?.unlocked;
  const kitHref = `/start?gen=${generationId}`;
  const micError = speech.error === "denied" ? x.interview.micDenied : speech.error === "unsupported" ? x.interview.micUnsupported : "";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-3xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>{x.interview.eyebrow}{gen ? ` · ${gen.title}` : ""}</Eyebrow>
            <h1 className="font-display mt-2 text-4xl text-ink">{x.interview.title}</h1>
          </div>
          {gen && <Link href={kitHref} className="text-sm text-muted hover:text-ink">← {x.interview.toKit}</Link>}
        </div>

        {phase === "missing" && <div className="card mt-8 p-8 text-center"><p className="text-ink-2">{x.interview.kitMissing}</p><Link href="/library" className="btn btn-ghost mt-5">{x.interview.toLibrary}</Link></div>}

        {(phase === "intro" || phase === "starting") && gen && (
          <div className="card mt-8 p-6 sm:p-8" data-testid="interview-intro">
            <span className="stamp">{preview ? x.interview.previewBadge : x.interview.fullBadge(MAX_QUESTIONS)}</span>
            <p className="mt-4 text-ink-2">{x.interview.subtitle}</p>
            <p className="eyebrow mt-6">{x.interview.howTitle}</p>
            <ol className="mt-2 space-y-2">
              {x.interview.how.map((h, i) => <li key={i} className="flex gap-3 text-sm text-ink-2"><span className="font-display text-xl leading-none text-oxblood">{i + 1}</span>{h}</li>)}
            </ol>
            {preview && <p className="mt-5 rounded-xl bg-gold-2 px-4 py-3 text-sm text-ink">{x.interview.previewNote}</p>}
            {limit ? <p className="mt-6 text-sm text-oxblood" role="alert">{x.interview.limit}</p> : (
              <button onClick={start} disabled={phase === "starting"} className="btn btn-primary mt-6" data-testid="interview-start">{phase === "starting" ? x.interview.starting : x.interview.start}</button>
            )}
            {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
          </div>
        )}

        {(phase === "question" || phase === "listening" || phase === "thinking") && session && question && (
          <div className="card mt-8 p-6 sm:p-8" data-testid="interview-question">
            <div className="flex items-center justify-between">
              <Eyebrow>{x.interview.questionOf(idx + 1, total)}</Eyebrow>
              <span className="text-xs text-muted">{session.mode === "preview" ? x.interview.preview : x.interview.fullBadge(total)}</span>
            </div>
            <div className="mt-4 rounded-xl border border-edge bg-paper p-5">
              <p className="text-[17px] leading-relaxed text-ink" data-testid="question-text">“{question.text}”</p>
              {voiceOn && <button type="button" onClick={() => void speak(question.text)} className="mt-3 text-xs font-semibold text-oxblood underline-offset-4 hover:underline" data-testid="interview-hear">▶ {x.interview.hear}</button>}
            </div>

            {phase === "listening" ? (
              <div className="mt-6 flex flex-col items-center gap-4">
                <button onClick={speech.stop} className="pulse relative grid h-20 w-20 place-items-center rounded-full bg-oxblood text-white" aria-label={x.interview.done} data-testid="answer-stop"><span className="text-2xl">■</span></button>
                <p className="text-sm font-medium text-oxblood">{x.interview.listening}</p>
                <p className="min-h-6 max-w-lg text-center text-sm text-muted" aria-live="polite">{speech.interim}</p>
                <button onClick={speech.stop} className="btn btn-ink">{x.interview.done}</button>
              </div>
            ) : phase === "thinking" ? (
              <p className="mt-6 text-center text-sm font-medium text-ink-2" data-testid="answer-thinking">{x.interview.thinking}</p>
            ) : typing ? (
              <div className="mt-6">
                <textarea className="field" rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={x.interview.placeholder} data-testid="answer-text" autoFocus />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button onClick={() => { setTyping(false); setError(""); }} className="btn btn-ghost">{x.interview.cancel}</button>
                  <button onClick={() => void submit(draft, "text")} className="btn btn-primary" data-testid="answer-submit">{x.interview.submit}</button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={listen} disabled={!canListen} className="btn btn-primary" data-testid="answer-voice">🎙 {x.interview.voiceAnswer}</button>
                <button onClick={() => setTyping(true)} className="btn btn-ghost" data-testid="answer-type">{x.interview.typeAnswer}</button>
                {session.turns.length > 0 && <button onClick={() => void finishEarly()} className="ml-auto text-sm text-muted hover:text-ink" data-testid="answer-finish">{x.interview.finishEarly}</button>}
              </div>
            )}
            {(error || micError) && phase !== "thinking" && <p className="mt-4 text-sm text-oxblood" role="alert" data-testid="answer-error">{error || micError}</p>}
          </div>
        )}

        {phase === "scored" && session && session.turns.length > 0 && (() => {
          const turn = session.turns[session.turns.length - 1];
          return (
            <div className="card mt-8 p-6 sm:p-8" data-testid="answer-score">
              <Eyebrow>{x.interview.questionOf(turn.questionIdx + 1, total)}</Eyebrow>
              <p className="mt-1 text-sm text-muted">{session.questions[turn.questionIdx]?.text}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <ScoreBars scores={turn.scores} labels={x.interview.scores} />
                <div className="text-center">
                  <p className="font-display text-6xl leading-none text-ink" data-testid="score-overall">{overallOf(turn.scores)}</p>
                  <p className="eyebrow mt-2">{x.interview.overall} / 10</p>
                </div>
              </div>
              <p className="eyebrow mt-7">{x.interview.coaching}</p>
              <ul className="mt-2 space-y-1.5">{turn.coaching.map((c, i) => <li key={i} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{c}</li>)}</ul>
              <div className="mt-5 rounded-xl border border-edge bg-paper p-4">
                <button onClick={() => setShowModel(!showModel)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink" data-testid="model-toggle">
                  {x.interview.modelAnswer}<span className="text-xs text-muted">{showModel ? x.interview.hide : x.interview.show}</span>
                </button>
                {showModel && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2" data-testid="model-answer">{turn.modelAnswer}</p>}
              </div>
              <details className="mt-3 text-sm text-muted"><summary className="cursor-pointer">{x.interview.yourAnswer}</summary><p className="mt-2 whitespace-pre-line text-ink-2">{turn.answer}</p></details>
              <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-edge pt-5">
                {session.status === "done" ? (
                  <button onClick={() => setPhase("summary")} className="btn btn-primary" data-testid="see-summary">{x.interview.seeSummary}</button>
                ) : (
                  <>
                    <button onClick={() => void finishEarly()} className="text-sm text-muted hover:text-ink" data-testid="answer-finish">{x.interview.finishEarly}</button>
                    <button onClick={next} className="btn btn-primary" data-testid="answer-next">{x.interview.next} →</button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {phase === "summary" && session && (
          <div className="card mt-8 p-6 sm:p-8" data-testid="interview-summary">
            <Eyebrow>{x.interview.summaryTitle} · {x.interview.answered(session.aggregate.answered, total)}</Eyebrow>
            <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="text-center"><p className="font-display text-7xl leading-none text-ink" data-testid="summary-overall">{session.aggregate.overall}</p><p className="eyebrow mt-2">{x.interview.overall} / 10</p></div>
              <ScoreBars scores={session.aggregate.averages} labels={x.interview.scores} />
            </div>
            {session.aggregate.weakest && (
              <div className="mt-6 rounded-xl bg-gold-2 px-4 py-3" data-testid="summary-weakest">
                <p className="eyebrow">{x.interview.weakest}</p>
                <p className="mt-1 font-semibold text-ink">{x.interview.scores[session.aggregate.weakest]}</p>
              </div>
            )}
            {session.summary && (
              <>
                <p className="eyebrow mt-7">{x.interview.rehearse}</p>
                <ol className="mt-2 space-y-2">{session.summary.rehearse.map((r, i) => <li key={i} className="flex gap-3 text-sm text-ink"><span className="font-display text-xl leading-none text-oxblood">{i + 1}</span>{r}</li>)}</ol>
                <p className="mt-4 text-sm text-ink-2">{session.summary.overall}</p>
              </>
            )}
            <p className="eyebrow mt-7">{x.interview.perQuestion}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-edge text-xs uppercase tracking-wide text-muted"><th className="py-2 pr-3 font-semibold">{x.interview.question}</th>{DIMENSIONS.map((d) => <th key={d} className="py-2 pr-3 font-semibold">{x.interview.scores[d]}</th>)}<th className="py-2 font-semibold">{x.interview.overall}</th></tr></thead>
                <tbody>{session.aggregate.perQuestion.map((q) => (
                  <tr key={q.questionIdx} className="border-b border-edge/60" data-testid="summary-row">
                    <td className="max-w-xs truncate py-2 pr-3 text-ink-2" title={session.questions[q.questionIdx]?.text}>{q.questionIdx + 1}. {session.questions[q.questionIdx]?.text}</td>
                    {DIMENSIONS.map((d) => <td key={d} className="py-2 pr-3 text-ink-2">{q.scores[d]}</td>)}
                    <td className="py-2 font-semibold text-ink">{q.overall}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {session.mode === "preview" && (
              <div className="mt-7 rounded-xl border border-dashed border-edge-2 bg-paper p-5">
                <p className="text-sm text-ink-2">{x.interview.previewNote}</p>
                <Link href={kitHref} className="btn btn-primary mt-4" data-testid="interview-unlock">{x.interview.unlockCta}</Link>
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
              <button onClick={again} className="btn btn-ink" data-testid="interview-again">{x.interview.again}</button>
              <Link href="/library" className="btn btn-ghost">{x.interview.toLibrary}</Link>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

function ScoreBars({ scores, labels }: { scores: Scores; labels: Record<"structure" | "specificity" | "relevance", string> }) {
  return (
    <div className="space-y-3">
      {DIMENSIONS.map((d) => (
        <div key={d} data-testid={`score-${d}`}>
          <div className="flex items-center justify-between text-sm"><span className="text-ink-2">{labels[d]}</span><span className="font-semibold text-ink">{scores[d]}</span></div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper-2"><div className={"h-full rounded-full transition-all " + (scores[d] >= 7 ? "bg-moss" : scores[d] >= 5 ? "bg-gold" : "bg-oxblood")} style={{ width: `${scores[d] * 10}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
