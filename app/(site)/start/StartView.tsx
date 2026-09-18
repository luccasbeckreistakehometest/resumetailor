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
import { RedFlagNotice } from "@/components/RedFlagNotice";
import { IntlCard } from "@/components/IntlCard";
import { WhatsNew } from "@/components/WhatsNew";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { apiErrorText } from "@/app/i18n/launch";
import { AuthModal } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { VoiceBriefing } from "@/components/VoiceBriefing";
import { ImportDrop, ImportableTextarea } from "@/components/FileDrop";
import ReactMarkdown from "react-markdown";
import { useDialog } from "@/components/useDialog";
import { Button, Checkbox, Chip, Container, Icon, Input, Notice, Sheet, Skeleton, Textarea } from "@/components/ui";
import type { Briefing } from "@/lib/ai/voice";
import type { ProfileFacts } from "@/lib/profile/facts";
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
  // What was said out loud (tailor/improve): the person can drop items before generating.
  const [spoken, setSpoken] = useState<ProfileFacts | null>(null);

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
      const payload: Record<string, string | boolean | string[]> = { mode: m, targetRole: override?.targetRole ?? targetRole, lang, source: override?.source ?? source, remember, ...(bid ? { briefingId: bid } : {}) };
      if (spoken && m !== "build") payload.spokenFacts = [...spoken.achievements, ...spoken.tools];
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
  }, [targetRole, lang, source, briefingId, jobDescription, resume, level, education, experience, skills, achievements, remember, spoken]);

  // Voice briefing confirmed: fill the form, then either paste what voice cannot carry or generate.
  function onBriefing(b: Briefing, id: string, facts: ProfileFacts | null) {
    setSource("voice"); setBriefingId(id);
    setSpoken(facts && facts.achievements.length + facts.tools.length > 0 ? facts : null);
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
  function reset() { setSpoken(null); setGen(null); setMode(null); setStep(0); setVia("choose"); setPasteNeeded(null); setSource("text"); setBriefingId(undefined); setNeedCredits(false); router.replace("/start"); }

  const total = mode ? flow.length + 1 : 1;
  const num = mode ? Math.min(step + 2, total) : 1;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="py-[var(--s-9)]">
        {!aiReady && (
          <Notice tone="query" className="mb-[var(--s-7)]"><span data-testid="ai-down">{l.aiDown}</span></Notice>
        )}

        {via === "choose" && !gen && <WhatsNew />}

        {/* 1. Talk or type. A fork, not a step: it gets no step number. */}
        {via === "choose" && !gen && (
          <div data-tour="choose" className="grid gap-[var(--gutter)] md:grid-cols-12">
            <div className="md:col-span-5">
              <h1 className="doc-45 text-[color:var(--ink)]">{x.choose.title}</h1>
              <p className="mt-[var(--s-5)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{x.choose.subtitle}</p>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <ul className="border-t border-[var(--rule)]">
                {([
                  { id: "voice", icon: "mic" as const, t: x.choose.talk.t, d: x.choose.talk.d, note: x.choose.mic, go: () => setVia("voice"), test: "via-voice" },
                  { id: "text", icon: "keyboard" as const, t: x.choose.type.t, d: x.choose.type.d, note: d.quiz.resume.subtitle, go: () => setVia("text"), test: "via-text" },
                ]).map((o) => (
                  <li key={o.id} className="border-b border-[var(--rule)]">
                    <button onClick={o.go} className="group flex w-full items-start gap-[var(--s-5)] py-[var(--s-6)] text-left" data-testid={o.test}>
                      <span className="mt-[2px] text-[color:var(--ink-muted)] group-hover:text-[color:var(--ink)]"><Icon name={o.icon} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="doc-21 block text-[color:var(--ink)]">{o.t}</span>
                        <span className="mt-[var(--s-2)] block font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{o.d}</span>
                        <span className="mt-[var(--s-3)] block font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{o.note}</span>
                      </span>
                      <span className="mt-[2px] text-[color:var(--ink-40)] group-hover:text-[color:var(--ink)]"><Icon name="arrow-right" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {via === "voice" && !gen && <VoiceBriefing onConfirm={onBriefing} onTypeInstead={() => setVia("text")} />}

        {/* 2. The form. Seven columns of one question, with what it is building beside it. */}
        {via === "text" && !gen && (
          <div className="grid gap-[var(--gutter)] md:grid-cols-12">
            <div className="md:col-span-7">
              {mode && (
                <div className="mb-[var(--s-7)]">
                  <div className="flex items-baseline justify-between gap-[var(--s-4)] border-b border-[var(--rule)] pb-[var(--s-3)]">
                    <p className="eyebrow">{d.quiz.stepOf(num, total)}</p>
                    <button onClick={back} className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]">← {d.quiz.back}</button>
                  </div>
                  {/* The progress rule: one segment per step of THIS flow, so the count cannot lie. */}
                  <div className="mt-[var(--s-3)] flex gap-[var(--s-2)]" aria-hidden>
                    {Array.from({ length: total }).map((_, i) => (
                      <span key={i} className="h-[2px] flex-1" style={{ background: i < num ? "var(--ink)" : "var(--rule)" }} />
                    ))}
                  </div>
                </div>
              )}

              {usingSaved && current !== "intent" && current !== "resume" && (
                <Notice tone="kept" icon="document" className="mb-[var(--s-6)]">
                  <span data-testid="saved-resume-chip">
                    {saved!.from === "kit" ? r.profile.fromKit : r.profile.usingSaved(saved!.date)}{" "}
                    <button type="button" onClick={() => setSaved(null)} className="font-medium text-[color:var(--ink)] underline underline-offset-[3px]" data-testid="saved-resume-change">{r.profile.change}</button>
                  </span>
                </Notice>
              )}

              {spoken && mode !== "build" && current !== "intent" && <SpokenChip facts={spoken} onChange={setSpoken} />}

              {current === "intent" && (
                <>
                  <h1 className="doc-31 text-[color:var(--ink)]">{d.quiz.intent.title}</h1>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{d.quiz.intent.subtitle}</p>
                  <ul className="mt-[var(--s-7)] border-t border-[var(--rule)]">
                    {(["tailor", "improve", "build"] as Mode[]).map((m) => (
                      <li key={m} className="border-b border-[var(--rule-hairline)]">
                        <button onClick={() => { setMode(m); setStep(0); setError(""); }} className="group flex w-full items-baseline gap-[var(--s-5)] py-[var(--s-5)] text-left" data-testid={`mode-${m}`}>
                          <span className="min-w-0 flex-1">
                            <span className="block font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{d.quiz.intent[m].t}</span>
                            <span className="mt-[var(--s-2)] block font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{d.quiz.intent[m].d}</span>
                          </span>
                          <span className="text-[color:var(--ink-40)] group-hover:text-[color:var(--ink)]"><Icon name="chevron-right" size={16} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setVia("voice")} className="mt-[var(--s-6)] inline-flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)] underline-offset-4 hover:text-[color:var(--ink)] hover:underline">
                    <Icon name="mic" size={16} />{x.choose.talk.t}
                  </button>
                </>
              )}

              {current === "role" && (
                <>
                  <h1 className="doc-31 text-[color:var(--ink)]">{d.quiz.role.title}</h1>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{d.quiz.role.subtitle}</p>
                  <label htmlFor="rt-role" className="sr-only">{d.quiz.role.title}</label>
                  <Input id="rt-role" className="mt-[var(--s-6)]" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder={d.quiz.role.placeholder} data-testid="role" autoFocus />
                  <p className="mt-[var(--s-6)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{d.quiz.role.levelLabel}</p>
                  <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-2)]">
                    {(Object.keys(d.quiz.role.levels) as (keyof typeof d.quiz.role.levels)[]).map((k) => (
                      <Chip key={k} selected={level === k} onClick={() => setLevel(k)}>{d.quiz.role.levels[k]}</Chip>
                    ))}
                  </div>
                </>
              )}

              {current === "job" && (
                <>
                  <h1 className="doc-31 text-[color:var(--ink)]">{d.quiz.job.title}</h1>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{pasteNeeded?.job ? x.voice.jobNeeded : d.quiz.job.subtitle}</p>
                  <label htmlFor="rt-job" className="sr-only">{d.quiz.job.title}</label>
                  <Textarea id="rt-job" className="mt-[var(--s-6)]" rows={9} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder={d.quiz.job.placeholder} data-testid="job" />
                  <RedFlagNotice text={jobDescription} />
                </>
              )}

              {current === "resume" && (
                <>
                  <h1 className="doc-31 text-[color:var(--ink)]">{d.quiz.resume.title}</h1>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{pasteNeeded?.resume ? x.voice.resumeNeeded : d.quiz.resume.subtitle}</p>
                  {carried && <Notice tone="kept" className="mt-[var(--s-4)]"><span data-testid="fit-carried">{x.fit.carried}</span></Notice>}
                  <div className="mt-[var(--s-6)]"><ImportableTextarea id="rt-resume" label={d.quiz.resume.title} value={resume} onChange={setResume} rows={11} placeholder={d.quiz.resume.placeholder} testId="resume" importTestId="import" /></div>
                  <div className="mt-[var(--s-4)]">
                    <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} data-testid="remember-resume" label={r.profile.remember} />
                  </div>
                </>
              )}

              {current === "build" && (
                <>
                  <h1 className="doc-31 text-[color:var(--ink)]">{d.quiz.build.title}</h1>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{d.quiz.build.subtitle}</p>
                  <ImportDrop className="mt-[var(--s-5)]" hint={x.importer.buildHint} testId="import" onText={(text) => setExperience((cur) => (cur.trim() ? `${cur.trim()}\n\n${text}` : text))} />
                  <div className="mt-[var(--s-6)] flex flex-col gap-[var(--s-5)]">
                    {([["edu", education, setEducation], ["exp", experience, setExperience], ["skills", skills, setSkills], ["ach", achievements, setAchievements]] as const).map(([k, v, set]) => (
                      <div key={k}>
                        <label htmlFor={`rt-build-${k}`} className="mb-[var(--s-3)] block font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{d.quiz.build[`${k}Label` as "eduLabel"]}</label>
                        <Textarea id={`rt-build-${k}`} rows={3} value={v} onChange={(e) => set(e.target.value)} placeholder={d.quiz.build[`${k}Ph` as "eduPh"]} data-testid={`build-${k}`} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* The waiting state is the shape of what is coming: a sheet, a meter, a list. */}
              {loading && (
                <div className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-6)]" data-testid="generating">
                  <p className="doc-21 text-[color:var(--ink)]">{d.quiz.generating.title}</p>
                  <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{d.quiz.generating.subtitle}</p>
                  <div className="mt-[var(--s-6)] flex flex-col gap-[var(--s-4)]">
                    <Skeleton w="38%" h={12} />
                    <Skeleton h={4} />
                    <Skeleton w="72%" h={12} />
                    <div className="mt-[var(--s-4)] flex flex-wrap gap-[var(--s-2)]">
                      {["112px", "86px", "64px", "128px", "92px"].map((w) => <Skeleton key={w} w={w} h={22} />)}
                    </div>
                  </div>
                </div>
              )}

              {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-5)]"><span>{error}</span></Notice>}

              {current !== "intent" && !loading && (
                <div className="mt-[var(--s-8)] flex justify-end border-t border-[var(--rule)] pt-[var(--s-5)]">
                  <Button onClick={next} size="lg" data-testid="next">{step + 1 >= flow.length ? d.landing.form.cta : d.quiz.next}</Button>
                </div>
              )}
            </div>

            {/* What the form is building, stated once, in the rail. */}
            {mode && (
              <aside className="md:col-span-4 md:col-start-9" data-density="compact">
                <p className="eyebrow border-b border-[var(--rule)] pb-[var(--s-3)]">{d.quiz.result.ready.split(".")[0]}</p>
                <ul className="mt-[var(--s-4)] flex flex-col gap-[var(--s-3)]">
                  {d.landing.hero.fine.split("·").map((part) => (
                    <li key={part} className="font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{part.trim()}</li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        )}

        {/* 3. The kit. The résumé is the largest object on the page. */}
        {gen && (
          <div data-testid="result">
            <div className="flex flex-wrap items-baseline justify-between gap-[var(--s-4)] border-b border-[var(--rule)] pb-[var(--s-4)]">
              <div className="flex items-baseline gap-[var(--s-3)]">
                {gen.source === "voice" && <span className="text-[color:var(--ink-muted)]"><Icon name="mic" size={16} /></span>}
                <p className="eyebrow">{gen.source === "voice" ? x.library.voice : d.quiz.result.ready.split(".")[0]}</p>
              </div>
              <button onClick={reset} className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]">{d.quiz.result.startOver}</button>
            </div>

            <div className="mt-[var(--s-7)] grid gap-[var(--s-9)] xl:grid-cols-12 xl:gap-x-[var(--gutter)]">
              {/* The document, and everything that is done to the document. */}
              <div className="min-w-0 xl:col-span-8">
                {gen.kit ? (
                  <>
                    <Sheet className="mb-[var(--s-7)]" data-testid="kit-document">
                      <div className="doc-modern"><ReactMarkdown>{gen.kit.resume}</ReactMarkdown></div>
                    </Sheet>
                    <div className="flex flex-wrap items-center gap-[var(--s-3)]">
                      <Button href={`/print?id=${gen.id}`} icon="download">{d.print.save}</Button>
                      <Button href={`/edit/${gen.id}`} variant="outline" icon="pencil" data-testid="edit-kit">{r.editor.cta}</Button>
                      <Button href={`/interview/${gen.id}`} variant="outline" icon="mic" data-testid="practice">{x.interview.practice}</Button>
                      <MoreActions gen={gen} />
                    </div>
                    <div className="mt-[var(--s-8)]" data-testid="kit">
                      <LetterStudio key={`letters-${gen.id}-${gen.deepened}`} gen={gen} />
                      <KitSection title="LinkedIn" body={gen.kit.linkedinAbout} />
                      <section className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-5)]">
                        <p className="eyebrow">{d.prep.title}</p>
                        <Prep label={d.prep.emphasis} items={gen.kit.emphasis} />
                        <Prep label={d.prep.talkingPoints} items={gen.kit.interviewPrep.talkingPoints} />
                        <Prep label={d.prep.technical} items={gen.kit.interviewPrep.technical} />
                        <Prep label={d.prep.behavioral} items={gen.kit.interviewPrep.behavioral} />
                        <Prep label={d.prep.questionsToAsk} items={gen.kit.interviewPrep.questionsToAsk} />
                      </section>
                    </div>
                  </>
                ) : (
                  <div data-testid="locked">
                    {/* The preview is a real page with a real edge, dimmed — not a blurred image. */}
                    <Sheet className="relative">
                      <p className="eyebrow">{d.quiz.result.coverPreview}</p>
                      <p className="doc-15 mt-[var(--s-4)] whitespace-pre-line text-[color:var(--ink-2)]">{gen.coverLetterPreview}…</p>
                      <div className="mt-[var(--s-6)] flex flex-col gap-[var(--s-3)]" aria-hidden>
                        {["96%", "88%", "92%", "70%"].map((w, i) => <Skeleton key={i} w={w} h={10} />)}
                      </div>
                    </Sheet>

                    <div className="mt-[var(--s-6)] border border-[var(--rule)] p-[var(--s-6)]">
                      <div className="flex items-baseline gap-[var(--s-3)]">
                        <span className="text-[color:var(--ink-muted)]"><Icon name="lock" size={16} /></span>
                        <p className="doc-21 text-[color:var(--ink)]">{d.quiz.result.lockedTitle}</p>
                      </div>
                      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{d.quiz.result.kitNote} · {d.prep.lockedTeaser}</p>
                      <div className="mt-[var(--s-5)]"><QuantifyCard gen={gen} onUpdate={setGen} /></div>
                      {gen.checks && <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]" data-testid="truth-teaser">{r.checks.lockedTeaser(gen.checks.truth.checked, gen.checks.truth.pending)}</p>}
                      <p className="mt-[var(--s-4)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-2)]">{user ? x.credits.badge(user.credits) : x.credits.firstFree}</p>
                      {needCredits ? (
                        <div className="mt-[var(--s-5)] flex flex-wrap items-center gap-[var(--s-4)]">
                          <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--mark)]">{x.credits.none}</p>
                          <Button href="/pricing">{x.credits.buy}</Button>
                        </div>
                      ) : (
                        <Button className="mt-[var(--s-5)]" size="lg" onClick={unlock} loading={unlocking} data-testid="unlock">{unlocking ? x.auth.working : x.credits.unlockWith}</Button>
                      )}
                      {error && <Notice tone="mark" icon="flag" className="mt-[var(--s-4)]"><span>{error}</span></Notice>}
                    </div>

                    <div className="mt-[var(--s-6)] flex flex-wrap items-center gap-[var(--s-3)] border-t border-[var(--rule)] pt-[var(--s-5)]">
                      <Button href={`/interview/${gen.id}`} variant="outline" size="sm" icon="mic" data-testid="practice">{x.interview.practice}</Button>
                      <span className="font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{x.interview.previewBadge}</span>
                      <Button href={`/pitch/${gen.id}`} variant="quiet" size="sm" data-testid="pitch-link">{r.pitch.cta}</Button>
                      <Button href={`/applications?add=1&gen=${gen.id}&role=${encodeURIComponent(gen.targetRole)}`} variant="quiet" size="sm" data-testid="track">{x.applications.trackFromKit}</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* The rail: what the machine measured and what it wants from you. */}
              <aside className="min-w-0 xl:col-span-4" data-density="compact">
                <MatchScore before={gen.matchBefore} after={gen.matchAfter} keywords={gen.keywords} addedLabel={d.quiz.result.added} />
                {gen.mode === "tailor" && <div className="mt-[var(--s-7)]"><PersonalisationMeter gen={gen} onUpdate={setGen} /></div>}
                {gen.mode === "tailor" && jobDescription && features.insights && <div className="mt-[var(--s-7)]"><CompanyInsights jobDescription={jobDescription} /></div>}
                {gen.kit && (
                  <>
                    <div className="mt-[var(--s-7)]"><QuantifyCard key={`q-${gen.id}`} gen={gen} onUpdate={setGen} /></div>
                    <div className="mt-[var(--s-7)]"><TruthCards gen={gen} compact onGen={setGen} /></div>
                    <Link href={`/edit/${gen.id}#changes`} className="mt-[var(--s-4)] inline-flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid="open-changes">
                      {r.checks.seeAll}<Icon name="arrow-right" size={16} />
                    </Link>
                    <div className="mt-[var(--s-7)]"><IntlCard key={`intl-${gen.id}`} gen={gen} /></div>
                    <div className="mt-[var(--s-7)]"><PublishPanel key={gen.id} gen={gen} /></div>
                  </>
                )}
              </aside>
            </div>
          </div>
        )}
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal initialMode="up" onClose={() => setAuthOpen(false)} onDone={() => { void unlock(); }} />}
    </div>
  );
}

/** Everything a kit can also become, one click deeper — so the screen has ONE primary action. */
function MoreActions({ gen }: { gen: GenerationView }) {
  const { d, x, r, l } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useDialog<HTMLDivElement>(() => setOpen(false));
  const item = "flex items-center justify-between gap-[var(--s-5)] px-[var(--s-5)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]";
  return (
    <div className="relative">
      <Button variant="quiet" onClick={() => setOpen(!open)} icon="chevron-down" iconEnd aria-expanded={open} data-testid="kit-more">{l.menu.more}</Button>
      {open && (
        <div ref={ref} role="menu" className="absolute left-0 top-[calc(100%+6px)] z-40 w-[260px] rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] py-[var(--s-2)]" style={{ boxShadow: "var(--shadow-pop)" }}>
          <Link href={`/pitch/${gen.id}`} className={item} role="menuitem" data-testid="pitch-link">{r.pitch.cta}</Link>
          <Link href={`/linkedin/${gen.id}`} className={item} role="menuitem" data-testid="linkedin-link">{x.linkedin.cta}</Link>
          <Link href={`/applications?add=1&gen=${gen.id}&role=${encodeURIComponent(gen.targetRole)}`} className={item} role="menuitem" data-testid="track">{x.applications.trackFromKit}</Link>
          <Link href={`/start?new=tailor&base=kit&kit=${gen.id}`} className={item} role="menuitem" title={r.profile.newJobHint} data-testid="new-job">{r.profile.newJob}</Link>
          <Link href="/library" className={item} role="menuitem">{d.nav.myCVs}</Link>
        </div>
      )}
    </div>
  );
}

function SpokenChip({ facts, onChange }: { facts: ProfileFacts; onChange: (f: ProfileFacts) => void }) {
  const { r } = useI18n();
  const V = r.voice;
  const drop = (list: "achievements" | "tools", i: number) => onChange({ ...facts, [list]: facts[list].filter((_, j) => j !== i) });
  const empty = facts.achievements.length + facts.tools.length === 0;
  return (
    <details className="mb-[var(--s-6)] rounded-[var(--r-1)] bg-[var(--kept-wash)] px-[var(--s-5)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]" style={{ borderLeft: "2px solid var(--kept)" }} data-testid="spoken-chip">
      <summary className="cursor-pointer">
        {empty ? V.chipEmpty : V.chip(facts.achievements.length, facts.tools.length)} · <span className="font-medium text-[color:var(--ink)] underline underline-offset-[3px]">{V.chipEdit}</span>
      </summary>
      <ul className="mt-[var(--s-3)] flex flex-col gap-[var(--s-2)]">
        {(["achievements", "tools"] as const).flatMap((list) => facts[list].map((f, i) => (
          <li key={`${list}-${i}`} className="flex items-start gap-[var(--s-3)] border-t border-[var(--rule-hairline)] pt-[var(--s-2)]" data-testid="spoken-fact">
            <span className="mt-[2px] shrink-0 font-mono text-[length:var(--mn-13)] text-[color:var(--ink-muted)]">{list === "tools" ? "tool" : "win"}</span>
            <span className="flex-1">{f}</span>
            <button type="button" onClick={() => drop(list, i)} className="shrink-0 text-[color:var(--ink-muted)] hover:text-[color:var(--mark)]" aria-label={V.chipRemove}><Icon name="close" size={16} /></button>
          </li>
        )))}
      </ul>
    </details>
  );
}

const KitSection = ({ title, body }: { title: string; body: string }) => (
  <section className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-5)]">
    <p className="eyebrow">{title}</p>
    <p className="doc-15 mt-[var(--s-3)] max-w-[var(--measure)] whitespace-pre-line text-[color:var(--ink)]">{body}</p>
  </section>
);

const Prep = ({ label, items }: { label: string; items: string[] }) => items.length ? (
  <div className="mt-[var(--s-5)]">
    <p className="font-sans text-[length:var(--ui-12)] font-semibold text-[color:var(--ink-2)]">{label}</p>
    <ul className="mt-[var(--s-2)] border-t border-[var(--rule-hairline)]">
      {items.map((s) => (
        <li key={s} className="flex items-start gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">
          <span aria-hidden className="mt-[10px] h-px w-[10px] shrink-0 bg-[var(--rule-field)]" />{s}
        </li>
      ))}
    </ul>
  </div>
) : null;

export function StartView() {
  return <Suspense fallback={null}><StartInner /></Suspense>;
}
