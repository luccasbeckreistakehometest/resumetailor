"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { MatchScore } from "@/components/MatchScore";
import { CompanyInsights } from "@/components/CompanyInsights";
import { PersonalisationMeter } from "@/components/PersonalisationMeter";
import { PublishPanel } from "@/components/PublishPanel";
import { LetterStudio } from "@/components/LetterStudio";
import { TruthCards } from "@/components/editor/KitChecks";
import { QuantifyCard } from "@/components/QuantifyCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { apiErrorText } from "@/app/i18n/launch";
import { AuthModal } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { VoiceBriefing } from "@/components/VoiceBriefing";
import { ImportDrop, ImportableTextarea } from "@/components/FileDrop";
import { Container, Eyebrow } from "@/components/ui";
import type { Briefing } from "@/lib/ai/voice";
import type { GenerationView } from "@/lib/server/generations";

type Mode = "tailor" | "improve" | "build";
type Via = "choose" | "voice" | "text";
const FLOWS: Record<Mode, string[]> = { tailor: ["role", "job", "resume"], improve: ["role", "resume"], build: ["role", "build"] };

function StartInner() {
  const { d, x, l, r, lang } = useI18n();
  const { user, refresh, aiReady, features } = useAuth();
  const params = useSearchParams();
  const router = useRouter();

  const [via, setVia] = useState<Via>(params.get("via") === "voice" ? "voice" : "choose");
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<"text" | "voice">("text");
  const [briefingId, setBriefingId] = useState<string | undefined>();
  const [pasteNeeded, setPasteNeeded] = useState<null | { resume: boolean; job: boolean }>(null);

  const [targetRole, setTargetRole] = useState(""); const [level, setLevel] = useState("");
  const [jobDescription, setJobDescription] = useState(""); const [resume, setResume] = useState("");
  const [education, setEducation] = useState(""); const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState(""); const [achievements, setAchievements] = useState("");

  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [gen, setGen] = useState<GenerationView | null>(null);
  const [authOpen, setAuthOpen] = useState(false); const [unlocking, setUnlocking] = useState(false);
  const [needCredits, setNeedCredits] = useState(false);
  const [carried, setCarried] = useState(false);
  // The saved base résumé (or a kit's résumé) pre-fills the paste step, which is then skipped.
  const [saved, setSaved] = useState<null | { from: "profile" | "kit"; date: string }>(null);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (params.get("from") === "fit" || params.get("gen")) return;
    const base = params.get("base");
    const kitId = params.get("kit");
    let cancelled = false;
    const dateOf = (iso: string) => new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang, { day: "2-digit", month: "2-digit" });
    const fromKit = base === "kit" && kitId
      ? fetch(`/api/generations/${encodeURIComponent(kitId)}`).then((res) => (res.ok ? res.json() : null)).then((g: GenerationView | null) => g?.kit ? { resume: g.kit.resume, role: g.targetRole, date: g.createdAt, from: "kit" as const } : null)
      : Promise.resolve(null);
    void fromKit.then(async (k) => k ?? fetch("/api/profile", { cache: "no-store" }).then((res) => res.json()).then((j) => j.profile?.resume ? { resume: j.profile.resume as string, role: (j.profile.roles?.[0] as string) ?? "", date: j.profile.updatedAt as string, from: "profile" as const } : null).catch(() => null))
      .then((found) => {
        if (cancelled) return;
        const fresh = params.get("new") === "tailor";
        if (fresh) {
          // "New job with this résumé": a clean tailor flow that starts at the posting.
          setGen(null); setNeedCredits(false); setPasteNeeded(null); setJobDescription(""); setError("");
          setVia("text"); setMode("tailor"); setStep(1);
        }
        if (!found) return;
        setResume((cur) => (fresh || !cur ? found.resume : cur));
        if (fresh) setTargetRole(found.role);
        setSaved({ from: found.from, date: dateOf(found.date) });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Arriving from the fit check: the posting and the résumé come along, so the kit is one click away.
  useEffect(() => {
    if (params.get("from") !== "fit") return;
    let carry: { role?: string; posting?: string; resume?: string } | null = null;
    try { carry = JSON.parse(sessionStorage.getItem("rt_fit_carry") ?? "null"); } catch {}
    if (!carry?.posting || !carry.resume) return;
    const c = carry;
    const id = setTimeout(() => {
      setVia("text"); setMode("tailor"); setTargetRole(c.role ?? ""); setJobDescription(c.posting ?? ""); setResume(c.resume ?? ""); setStep(FLOWS.tailor.length - 1); setCarried(true);
    }, 0);
    return () => clearTimeout(id);
  }, [params]);

  // Reopening a saved kit from the library.
  useEffect(() => {
    const id = params.get("gen");
    if (!id) return;
    fetch(`/api/generations/${id}`).then((r) => r.ok ? r.json() : null).then((j) => { if (j) { setGen(j); setVia("text"); setMode(j.mode); } });
  }, [params]);

  const usingSaved = !!saved && resume.trim().length >= 30;
  const flow = mode ? FLOWS[mode].filter((st) => !(st === "resume" && usingSaved && !pasteNeeded?.resume)) : [];
  const current = gen ? "result" : !mode ? "intent" : flow[step] ?? "result";

  const profile = () => [level && `Level: ${level}`, education && `Education:\n${education}`, experience && `Experience:\n${experience}`, skills && `Skills:\n${skills}`, achievements && `Achievements:\n${achievements}`].filter(Boolean).join("\n\n");

  // `override` exists because React state set in the same tick is not visible to this closure yet —
  // the voice path fills the form and generates in one go.
  const generate = useCallback(async (m: Mode, override?: Partial<{ targetRole: string; profile: string; source: "text" | "voice"; briefingId: string }>) => {
    setError(""); setLoading(true);
    try {
      const bid = override?.briefingId ?? briefingId;
      const payload: Record<string, string | boolean> = { mode: m, targetRole: override?.targetRole ?? targetRole, lang, source: override?.source ?? source, remember, ...(bid ? { briefingId: bid } : {}) };
      if (m === "tailor") Object.assign(payload, { jobDescription, resume });
      else if (m === "improve") Object.assign(payload, { resume });
      else Object.assign(payload, { profile: override?.profile ?? profile() });
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorText(j, l, d.quiz.validation.generic));
      setGen(j); localStorage.setItem("rt_last_gen", j.id);
    } catch (e) { setError(e instanceof Error ? e.message : d.quiz.validation.generic); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, lang, source, briefingId, jobDescription, resume, level, education, experience, skills, achievements, remember]);

  // Voice briefing confirmed: fill the form, then either paste what voice cannot carry or generate.
  function onBriefing(b: Briefing, id: string) {
    setSource("voice"); setBriefingId(id);
    setTargetRole(b.targetRole); setLevel(b.level === "unknown" ? "" : b.level);
    setEducation(b.education); setExperience(b.experience); setSkills(b.skills); setAchievements(b.achievements);
    const m: Mode = b.mode === "unknown" ? "build" : b.mode;
    setMode(m); setVia("text");
    if (m === "build") {
      setStep(FLOWS.build.length);
      const prof = [b.level !== "unknown" && `Level: ${b.level}`, b.education && `Education:\n${b.education}`, b.experience && `Experience:\n${b.experience}`, b.skills && `Skills:\n${b.skills}`, b.achievements && `Achievements:\n${b.achievements}`].filter(Boolean).join("\n\n");
      void generate("build", { targetRole: b.targetRole, profile: prof, source: "voice", briefingId: id });
    }
    else { setPasteNeeded({ resume: true, job: m === "tailor" }); setStep(m === "tailor" ? 1 : 1); }
  }

  // The server owns the session: a 401 means "sign in first". Not reading `user` here keeps the
  // retry after signup from seeing a stale closure in which nobody was logged in yet.
  async function unlock() {
    if (!gen) return;
    setUnlocking(true); setError("");
    const r = await fetch(`/api/generations/${gen.id}/unlock`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setUnlocking(false);
    if (r.status === 401) { setAuthOpen(true); return; }
    if (r.status === 402) { setNeedCredits(true); return; }
    if (!r.ok) { setError(apiErrorText(j, l, d.quiz.validation.generic)); return; }
    setGen(j); await refresh();
  }

  function validate(): string {
    if (current === "role" && targetRole.trim().length < 2) return d.quiz.validation.role;
    if (current === "job" && jobDescription.trim().length < 30) return d.quiz.validation.job;
    if (current === "resume" && resume.trim().length < 30) return d.quiz.validation.resume;
    if (current === "build" && education.trim().length + skills.trim().length < 20) return d.quiz.validation.build;
    return "";
  }
  function next() {
    const err = validate(); if (err) return setError(err);
    setError("");
    if (step + 1 >= flow.length) void generate(mode!); else setStep(step + 1);
  }
  function back() { setError(""); if (step === 0) { setMode(null); setPasteNeeded(null); } else setStep(step - 1); }
  function reset() { setGen(null); setMode(null); setStep(0); setVia("choose"); setPasteNeeded(null); setSource("text"); setBriefingId(undefined); setNeedCredits(false); router.replace("/start"); }

  const total = mode ? flow.length + 1 : 1;
  const num = mode ? Math.min(step + 2, total) : 1;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="max-w-3xl py-10">
        {!aiReady && <p className="mb-6 rounded-xl border border-gold bg-gold-2 px-4 py-3 text-sm text-ink" role="status" data-testid="ai-down">{l.aiDown}</p>}

        {/* 1. Talk or type */}
        {via === "choose" && !gen && (
          <div data-tour="choose">
            <Eyebrow>{d.quiz.stepOf(1, 2)}</Eyebrow>
            <h1 className="font-display mt-2 text-4xl text-ink">{x.choose.title}</h1>
            <p className="mt-2 text-ink-2">{x.choose.subtitle}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-stretch">
              <button onClick={() => setVia("voice")} className="card flex h-full flex-col p-6 text-left transition hover:-translate-y-0.5" data-testid="via-voice">
                <MicIcon />
                <p className="font-display mt-4 text-2xl text-ink">{x.choose.talk.t}</p>
                <p className="mt-1.5 flex-1 text-sm text-ink-2">{x.choose.talk.d}</p>
                <p className="mt-4 text-xs text-muted">{x.choose.mic}</p>
              </button>
              <button onClick={() => setVia("text")} className="card flex h-full flex-col p-6 text-left transition hover:-translate-y-0.5" data-testid="via-text">
                <KeysIcon />
                <p className="font-display mt-4 text-2xl text-ink">{x.choose.type.t}</p>
                <p className="mt-1.5 flex-1 text-sm text-ink-2">{x.choose.type.d}</p>
                <p className="mt-4 text-xs text-muted">{d.quiz.resume.subtitle}</p>
              </button>
            </div>
          </div>
        )}

        {via === "voice" && !gen && <VoiceBriefing onConfirm={onBriefing} onTypeInstead={() => setVia("text")} />}

        {via === "text" && !gen && (
          <div className="card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <Eyebrow>{d.quiz.stepOf(num, total)}</Eyebrow>
              {mode && <button onClick={back} className="text-sm text-muted hover:text-ink">← {d.quiz.back}</button>}
            </div>

            {usingSaved && current !== "intent" && current !== "resume" && (
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-moss-2 px-4 py-2.5 text-sm text-ink" data-testid="saved-resume-chip">
                <span>📄 {saved!.from === "kit" ? r.profile.fromKit : r.profile.usingSaved(saved!.date)}</span>
                <button type="button" onClick={() => setSaved(null)} className="font-semibold text-oxblood underline-offset-4 hover:underline" data-testid="saved-resume-change">· {r.profile.change}</button>
              </p>
            )}

            {current === "intent" && (
              <>
                <h1 className="font-display mt-2 text-3xl text-ink">{d.quiz.intent.title}</h1>
                <p className="mt-1 text-sm text-muted">{d.quiz.intent.subtitle}</p>
                <div className="mt-6 grid gap-3">
                  {(["tailor", "improve", "build"] as Mode[]).map((m) => (
                    <button key={m} onClick={() => { setMode(m); setStep(0); setError(""); }} className="rounded-xl border border-edge-2 bg-paper p-4 text-left transition hover:border-ink" data-testid={`mode-${m}`}>
                      <p className="font-semibold text-ink">{d.quiz.intent[m].t}</p>
                      <p className="mt-0.5 text-sm text-ink-2">{d.quiz.intent[m].d}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setVia("voice")} className="mt-6 text-sm text-oxblood underline-offset-4 hover:underline">🎙 {x.choose.talk.t}</button>
              </>
            )}

            {current === "role" && (
              <>
                <h1 className="font-display mt-2 text-3xl text-ink">{d.quiz.role.title}</h1>
                <p className="mt-1 text-sm text-muted">{d.quiz.role.subtitle}</p>
                <label htmlFor="rt-role" className="sr-only">{d.quiz.role.title}</label>
                <input id="rt-role" className="field mt-6" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder={d.quiz.role.placeholder} data-testid="role" autoFocus />
                <p className="mt-5 text-sm font-medium text-ink-2">{d.quiz.role.levelLabel}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(d.quiz.role.levels) as (keyof typeof d.quiz.role.levels)[]).map((k) => (
                    <button key={k} onClick={() => setLevel(k)} className={"rounded-full border px-3 py-1.5 text-sm " + (level === k ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2 hover:border-ink")}>{d.quiz.role.levels[k]}</button>
                  ))}
                </div>
              </>
            )}

            {current === "job" && (
              <>
                <h1 className="font-display mt-2 text-3xl text-ink">{d.quiz.job.title}</h1>
                <p className="mt-1 text-sm text-muted">{pasteNeeded?.job ? x.voice.jobNeeded : d.quiz.job.subtitle}</p>
                <label htmlFor="rt-job" className="sr-only">{d.quiz.job.title}</label>
                <textarea id="rt-job" className="field mt-6" rows={9} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder={d.quiz.job.placeholder} data-testid="job" />
              </>
            )}

            {current === "resume" && (
              <>
                <h1 className="font-display mt-2 text-3xl text-ink">{d.quiz.resume.title}</h1>
                <p className="mt-1 text-sm text-muted">{pasteNeeded?.resume ? x.voice.resumeNeeded : d.quiz.resume.subtitle}</p>
                {carried && <p className="mt-3 rounded-xl bg-gold-2 px-4 py-2.5 text-sm text-ink" data-testid="fit-carried">{x.fit.carried}</p>}
                <div className="mt-6"><ImportableTextarea id="rt-resume" label={d.quiz.resume.title} value={resume} onChange={setResume} rows={11} placeholder={d.quiz.resume.placeholder} testId="resume" importTestId="import" /></div>
                <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--color-oxblood)]" data-testid="remember-resume" />
                  {r.profile.remember}
                </label>
              </>
            )}

            {current === "build" && (
              <>
                <h1 className="font-display mt-2 text-3xl text-ink">{d.quiz.build.title}</h1>
                <p className="mt-1 text-sm text-muted">{d.quiz.build.subtitle}</p>
                <ImportDrop className="mt-5" hint={x.importer.buildHint} testId="import" onText={(text) => setExperience((cur) => (cur.trim() ? `${cur.trim()}\n\n${text}` : text))} />
                <div className="mt-6 space-y-4">
                  {([["edu", education, setEducation], ["exp", experience, setExperience], ["skills", skills, setSkills], ["ach", achievements, setAchievements]] as const).map(([k, v, set]) => (
                    <div key={k}>
                      <label htmlFor={`rt-build-${k}`} className="mb-1.5 block text-sm font-medium text-ink-2">{d.quiz.build[`${k}Label` as "eduLabel"]}</label>
                      <textarea id={`rt-build-${k}`} className="field" rows={3} value={v} onChange={(e) => set(e.target.value)} placeholder={d.quiz.build[`${k}Ph` as "eduPh"]} data-testid={`build-${k}`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {loading && (
              <div className="mt-8 rounded-xl bg-paper p-6 text-center" data-testid="generating">
                <p className="font-display text-2xl text-ink">{d.quiz.generating.title}</p>
                <p className="mt-1 text-sm text-muted">{d.quiz.generating.subtitle}</p>
              </div>
            )}
            {error && <p className="mt-4 text-sm text-oxblood" role="alert">{error}</p>}
            {current !== "intent" && !loading && (
              <div className="mt-8 flex justify-end">
                <button onClick={next} className="btn btn-primary" data-testid="next">{step + 1 >= flow.length ? d.landing.form.cta : d.quiz.next}</button>
              </div>
            )}
          </div>
        )}

        {/* Result: free preview, one credit to open */}
        {gen && (
          <div className="space-y-5" data-testid="result">
            <div className="flex items-center justify-between">
              <Eyebrow>{gen.source === "voice" ? `🎙 ${x.library.voice}` : d.quiz.result.ready.split(".")[0]}</Eyebrow>
              <button onClick={reset} className="text-sm text-muted hover:text-ink">{d.quiz.result.startOver}</button>
            </div>
            <MatchScore before={gen.matchBefore} after={gen.matchAfter} keywords={gen.keywords} addedLabel={d.quiz.result.added} />
            {gen.mode === "tailor" && <PersonalisationMeter gen={gen} onUpdate={setGen} />}
            {gen.mode === "tailor" && jobDescription && features.insights && <CompanyInsights jobDescription={jobDescription} />}

            {gen.kit ? (
              <div className="card p-6" data-testid="kit">
                <p className="text-sm font-medium text-moss">✓ {x.credits.unlocked}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/print?id=${gen.id}`} target="_blank" className="btn btn-primary">{d.print.save}</Link>
                  <Link href={`/edit/${gen.id}`} className="btn btn-ink" data-testid="edit-kit">✎ {r.editor.cta}</Link>
                  <Link href={`/interview/${gen.id}`} className="btn btn-ink" data-testid="practice">🎙 {x.interview.practice}</Link>
                  <Link href={`/linkedin/${gen.id}`} className="btn btn-ghost" data-testid="linkedin-link">in · {x.linkedin.cta}</Link>
                  <Link href={`/applications?add=1&gen=${gen.id}&role=${encodeURIComponent(gen.targetRole)}`} className="btn btn-ghost" data-testid="track">{x.applications.trackFromKit}</Link>
                  <Link href={`/start?new=tailor&base=kit&kit=${gen.id}`} className="btn btn-ghost" title={r.profile.newJobHint} data-testid="new-job">{r.profile.newJob}</Link>
                  <Link href="/library" className="btn btn-ghost">{d.nav.myCVs}</Link>
                </div>
                <div className="mt-6"><QuantifyCard key={`q-${gen.id}`} gen={gen} onUpdate={setGen} /></div>
                <div className="mt-6"><TruthCards gen={gen} compact onGen={setGen} /></div>
                <Link href={`/edit/${gen.id}#changes`} className="mt-2 inline-block text-sm font-medium text-oxblood underline-offset-4 hover:underline" data-testid="open-changes">{r.checks.seeAll} →</Link>
                <div className="mt-6"><PublishPanel key={gen.id} gen={gen} /></div>
                <LetterStudio key={`letters-${gen.id}-${gen.deepened}`} gen={gen} />
                <Section title="LinkedIn" body={gen.kit.linkedinAbout} />
                <div className="mt-6">
                  <p className="eyebrow">{d.prep.title}</p>
                  <Prep label={d.prep.emphasis} items={gen.kit.emphasis} />
                  <Prep label={d.prep.talkingPoints} items={gen.kit.interviewPrep.talkingPoints} />
                  <Prep label={d.prep.technical} items={gen.kit.interviewPrep.technical} />
                  <Prep label={d.prep.behavioral} items={gen.kit.interviewPrep.behavioral} />
                  <Prep label={d.prep.questionsToAsk} items={gen.kit.interviewPrep.questionsToAsk} />
                </div>
              </div>
            ) : (
              <div className="card p-6" data-testid="locked">
                <p className="eyebrow">{d.quiz.result.coverPreview}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{gen.coverLetterPreview}…</p>
                <div className="mt-5 rounded-xl border border-dashed border-edge-2 bg-paper p-5">
                  <p className="font-display text-xl text-ink">🔒 {d.quiz.result.lockedTitle}</p>
                  <p className="mt-1 text-sm text-muted">{d.quiz.result.kitNote} · {d.prep.lockedTeaser}</p>
                  <div className="mt-2"><QuantifyCard gen={gen} onUpdate={setGen} /></div>
                  {gen.checks && <p className="mt-2 text-sm text-ink-2" data-testid="truth-teaser">🔎 {r.checks.lockedTeaser(gen.checks.truth.checked, gen.checks.truth.pending)}</p>}
                  <p className="mt-3 text-sm text-ink-2">{user ? x.credits.badge(user.credits) : x.credits.firstFree}</p>
                  {needCredits ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-oxblood">{x.credits.none}</p>
                      <Link href="/pricing" className="btn btn-primary">{x.credits.buy}</Link>
                    </div>
                  ) : (
                    <button onClick={unlock} disabled={unlocking} className="btn btn-primary mt-4" data-testid="unlock">{unlocking ? x.auth.working : x.credits.unlockWith}</button>
                  )}
                </div>
                {error && <p className="mt-3 text-sm text-oxblood" role="alert">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-edge pt-5">
                  <Link href={`/interview/${gen.id}`} className="btn btn-ghost !py-2 !text-sm" data-testid="practice">🎙 {x.interview.practice}</Link>
                  <span className="text-xs text-muted">{x.interview.previewBadge}</span>
                  <Link href={`/applications?add=1&gen=${gen.id}&role=${encodeURIComponent(gen.targetRole)}`} className="btn btn-ghost !py-2 !text-sm" data-testid="track">{x.applications.trackFromKit}</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal initialMode="up" onClose={() => setAuthOpen(false)} onDone={() => { void unlock(); }} />}
    </div>
  );
}

const MicIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-oxblood" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" strokeLinecap="round" />
  </svg>
);
const KeysIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink" aria-hidden>
    <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" strokeLinecap="round" />
  </svg>
);

const Section = ({ title, body }: { title: string; body: string }) => (
  <div className="mt-6"><p className="eyebrow">{title}</p><p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{body}</p></div>
);
const Prep = ({ label, items }: { label: string; items: string[] }) => items.length ? (
  <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-oxblood">{label}</p>
    <ul className="mt-1.5 space-y-1.5">{items.map((s) => <li key={s} className="flex gap-2 text-sm text-ink-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{s}</li>)}</ul></div>
) : null;

export function StartView() {
  return <Suspense fallback={null}><StartInner /></Suspense>;
}
