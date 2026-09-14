"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MatchScore, Keyword } from "@/components/MatchScore";
import { CompanyInsights } from "@/components/CompanyInsights";

type Mode = "tailor" | "improve" | "build";
type Result = {
  resume: string;
  coverLetter: string;
  linkedinAbout: string;
  matchBefore: number;
  matchAfter: number;
  keywords: Keyword[];
  matchNotes: string;
};

const FLOWS: Record<Mode, string[]> = {
  tailor: ["role", "job", "resume", "result"],
  improve: ["role", "resume", "result"],
  build: ["role", "build", "result"],
};

export default function StartPage() {
  const { d } = useI18n();
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);

  // fields
  const [targetRole, setTargetRole] = useState("");
  const [level, setLevel] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [achievements, setAchievements] = useState("");

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const flow = mode ? FLOWS[mode] : [];
  const current = mode ? flow[step] : "intent";
  const totalSteps = mode ? flow.length + 1 : 1;
  const currentNum = mode ? step + 2 : 1;

  async function generate() {
    setError("");
    setLoading(true);
    try {
      let payload: Record<string, string> = { mode: mode as string, targetRole };
      if (mode === "tailor") payload = { ...payload, jobDescription, resume };
      else if (mode === "improve") payload = { ...payload, resume };
      else if (mode === "build") {
        const profile = [
          level && `Level: ${level}`,
          education && `Education:\n${education}`,
          experience && `Experience:\n${experience}`,
          skills && `Skills:\n${skills}`,
          achievements && `Achievements:\n${achievements}`,
        ]
          .filter(Boolean)
          .join("\n\n");
        payload = { ...payload, profile };
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || d.quiz.validation.generic);
      setResult(data);
      localStorage.setItem("rt_result", JSON.stringify(data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : d.quiz.validation.generic);
    } finally {
      setLoading(false);
    }
  }

  // trigger generation when we reach the result step
  useEffect(() => {
    if (current === "result" && !result && !loading && !error) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  async function checkout() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || d.quiz.validation.generic);
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : d.quiz.validation.generic);
      setPaying(false);
    }
  }

  function validateCurrent(): string {
    if (current === "role" && targetRole.trim().length < 2) return d.quiz.validation.role;
    if (current === "job" && jobDescription.trim().length < 30) return d.quiz.validation.job;
    if (current === "resume" && resume.trim().length < 30) return d.quiz.validation.resume;
    if (current === "build" && (education.trim().length + skills.trim().length) < 20) return d.quiz.validation.build;
    return "";
  }

  function next() {
    const err = validateCurrent();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    if (step === 0) {
      setMode(null);
      return;
    }
    setStep((s) => s - 1);
  }

  function pickMode(m: Mode) {
    setMode(m);
    setStep(0);
    setError("");
    setResult(null);
  }

  const teaser = result ? result.coverLetter.split("\n").slice(0, 2).join("\n") : "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">RT</div>
            <span className="text-base font-semibold tracking-tight text-slate-900">ResumeTailor</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span>{d.quiz.stepOf(currentNum, totalSteps)}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(currentNum / totalSteps) * 100}%` }} />
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 py-8">
        {/* Intent */}
        {current === "intent" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{d.quiz.intent.title}</h1>
            <p className="mt-2 text-slate-600">{d.quiz.intent.subtitle}</p>
            <div className="mt-6 space-y-3">
              {(["tailor", "improve", "build"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => pickMode(m)}
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{d.quiz.intent[m].t}</div>
                    <div className="mt-0.5 text-sm text-slate-500">{d.quiz.intent[m].d}</div>
                  </div>
                  <span className="ml-auto text-slate-300">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Role */}
        {current === "role" && (
          <StepCard title={d.quiz.role.title} subtitle={d.quiz.role.subtitle}>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder={d.quiz.role.placeholder}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <label className="mt-4 block text-sm font-semibold text-slate-700">{d.quiz.role.levelLabel}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["student", "entry", "mid", "senior"] as const).map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(d.quiz.role.levels[lv])}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition " +
                    (level === d.quiz.role.levels[lv]
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300")
                  }
                >
                  {d.quiz.role.levels[lv]}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {/* Job */}
        {current === "job" && (
          <StepCard title={d.quiz.job.title} subtitle={d.quiz.job.subtitle}>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={9}
              placeholder={d.quiz.job.placeholder}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </StepCard>
        )}

        {/* Resume */}
        {current === "resume" && (
          <StepCard title={d.quiz.resume.title} subtitle={d.quiz.resume.subtitle}>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={10}
              placeholder={d.quiz.resume.placeholder}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </StepCard>
        )}

        {/* Build (first resume) */}
        {current === "build" && (
          <StepCard title={d.quiz.build.title} subtitle={d.quiz.build.subtitle}>
            <div className="space-y-4">
              <Field label={d.quiz.build.eduLabel} value={education} onChange={setEducation} placeholder={d.quiz.build.eduPh} rows={3} />
              <Field label={d.quiz.build.expLabel} value={experience} onChange={setExperience} placeholder={d.quiz.build.expPh} rows={3} />
              <Field label={d.quiz.build.skillsLabel} value={skills} onChange={setSkills} placeholder={d.quiz.build.skillsPh} rows={2} />
              <Field label={d.quiz.build.achLabel} value={achievements} onChange={setAchievements} placeholder={d.quiz.build.achPh} rows={2} />
            </div>
          </StepCard>
        )}

        {/* Result */}
        {current === "result" && (
          <div>
            {loading && (
              <div className="py-16 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                <h2 className="mt-5 text-lg font-semibold text-slate-900">{d.quiz.generating.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{d.quiz.generating.subtitle}</p>
              </div>
            )}

            {!loading && error && (
              <div className="py-10 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button onClick={generate} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  {d.quiz.next}
                </button>
              </div>
            )}

            {!loading && result && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <span>✅</span> {d.quiz.result.ready}
                </div>

                <MatchScore before={result.matchBefore} after={result.matchAfter} keywords={result.keywords} addedLabel={d.quiz.result.added} />

                {mode === "tailor" && jobDescription.trim().length >= 30 && <CompanyInsights jobDescription={jobDescription} />}

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{d.quiz.result.coverPreview}</h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{teaser}</p>
                  <p className="mt-2 select-none whitespace-pre-wrap text-sm text-slate-800 blur-[3px]" aria-hidden>
                    {result.coverLetter.split("\n").slice(2).join("\n") || "…"}
                  </p>
                </section>

                <section className="relative rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{d.quiz.result.lockedTitle}</h3>
                  <div className="h-28 select-none overflow-hidden blur-[3px]" aria-hidden>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{result.resume}</pre>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/30">
                    <span className="rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-medium text-white">🔒 {d.quiz.result.locked}</span>
                  </div>
                </section>

                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  🔒 {d.prep.lockedTeaser}
                </div>

                <button
                  onClick={checkout}
                  disabled={paying}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {d.quiz.result.unlock}
                </button>
                <p className="text-center text-xs text-slate-400">{d.quiz.result.kitNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        {current !== "intent" && current !== "result" && (
          <div className="mt-6 flex items-center justify-between">
            <button onClick={back} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800">
              ← {d.quiz.back}
            </button>
            {error && current !== "result" && <span className="text-sm text-red-600">{error}</span>}
            <button onClick={next} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
              {d.quiz.next} →
            </button>
          </div>
        )}

        {current === "intent" && (
          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">
              ← {d.nav.tailor}
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
