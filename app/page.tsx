"use client";

import { useState } from "react";
import Link from "next/link";
import { PROOF_STATS } from "./i18n/proofStats";
import { useI18n } from "./i18n/I18nProvider";
import { MatchScore, Keyword } from "@/components/MatchScore";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CompanyInsights } from "@/components/CompanyInsights";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";
import { AuthButton } from "@/components/AuthButton";

type Result = {
  resume: string;
  coverLetter: string;
  linkedinAbout: string;
  matchBefore: number;
  matchAfter: number;
  keywords: Keyword[];
  matchNotes: string;
};

const ROLES = [
  "Sales", "Marketing", "Finance", "Software Engineering", "Nursing", "Product Management",
  "Data Analysis", "Customer Success", "HR & Recruiting", "Design", "Operations", "Accounting",
  "Project Management", "Teaching", "Consulting",
];

const ATS_SYSTEMS = ["Workday", "Greenhouse", "Gupy", "Lever", "SAP SuccessFactors", "Taleo", "iCIMS"];

export default function Home() {
  const { d, lang } = useI18n();
  const L = d.landing;
  const pricingLabel = { en: "Pricing", pt: "Preços", es: "Precios" }[lang];
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    setError("");
    setResult(null);
    if (jobDescription.trim().length < 30 || resume.trim().length < 30) {
      setError(L.form.errPaste);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tailor", jobDescription, resume }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      localStorage.setItem("rt_result", JSON.stringify(data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setPaying(false);
    }
  }

  const teaser = result ? result.coverLetter.split("\n").slice(0, 2).join("\n") : "";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header (dark, sticky) */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">RT</div>
            <span className="text-base font-semibold tracking-tight text-white">ResumeTailor</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden text-sm font-medium text-slate-300 hover:text-white sm:block">{pricingLabel}</Link>
            <Link href="/library" className="hidden text-sm font-medium text-slate-300 hover:text-white sm:block">{d.nav.myCVs}</Link>
            <AuthButton dark />
            <LanguageSwitcher />
            <a href="#app" className="hidden rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 sm:inline-block">
              {d.nav.tailor}
            </a>
          </div>
        </div>
      </header>

      {/* Hero (dark, demo-driven) */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[360px] w-[360px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {L.hero.badge}
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {L.hero.title}{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {L.hero.titleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-300">{L.hero.subtitle}</p>
            <ul className="mt-7 space-y-3 text-sm text-slate-200">
              {L.hero.bullets.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <svg className="mt-0.5 h-5 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#app" className="rounded-xl bg-indigo-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">
                {L.form.cta}
              </a>
              <a href="#how" className="rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-slate-200 transition hover:bg-white/5">
                {L.how.title}
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-400">{L.hero.fine}</p>
            <Link href="/start" className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
              {d.nav.noResume} →
            </Link>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LiveMatchDemo />
          </div>
        </div>
      </section>

      {/* Role ticker */}
      <section className="border-b border-slate-200 bg-slate-900 py-4">
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-3">
            {[...ROLES, ...ROLES].map((role, i) => (
              <span key={i} className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300">{role}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ATS compatibility bar (honest — systems, not employer endorsements) */}
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <p className="text-sm font-semibold text-slate-700">{d.atsBar.title}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {ATS_SYSTEMS.map((s) => (
              <span key={s} className="text-base font-semibold tracking-tight text-slate-400">{s}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">{d.atsBar.note}</p>
        </div>
      </section>

      {/* App / tool */}
      <section id="app" className="scroll-mt-20 bg-slate-50 py-16">
        <div className="mx-auto max-w-2xl px-5">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{L.finalCta.title}</h2>
            <p className="mt-2 text-slate-600">{L.finalCta.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-7">
            {!result && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{L.form.jobLabel}</label>
                  <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={5} placeholder={L.form.jobPh}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{L.form.resumeLabel}</label>
                  <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={6} placeholder={L.form.resumePh}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <button onClick={generate} disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">
                  {loading ? L.form.ctaLoading : L.form.cta}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                  {L.form.secure}
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <MatchScore before={result.matchBefore} after={result.matchAfter} keywords={result.keywords} addedLabel={L.result.added} />
                <CompanyInsights jobDescription={jobDescription} />
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{L.result.coverPreview}</h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{teaser}</p>
                  <p className="mt-2 select-none whitespace-pre-wrap text-sm text-slate-800 blur-[3px]" aria-hidden>
                    {result.coverLetter.split("\n").slice(2).join("\n") || "…"}
                  </p>
                </section>
                <section className="relative rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{L.result.lockedTitle}</h3>
                  <div className="h-28 select-none overflow-hidden blur-[3px]" aria-hidden>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{result.resume}</pre>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/30">
                    <span className="rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-medium text-white">🔒 {L.result.locked}</span>
                  </div>
                </section>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  🔒 {d.prep.lockedTeaser}
                </div>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <button onClick={checkout} disabled={paying}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">
                  {paying ? L.form.ctaLoading : L.result.unlock}
                </button>
                <p className="text-center text-xs text-slate-400">{L.result.kitNote}</p>
                <button onClick={() => { setResult(null); localStorage.removeItem("rt_result"); }}
                  className="w-full text-center text-sm text-slate-400 transition hover:text-slate-600">
                  ← {L.result.startOver}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Proof / stats band (dark, high-impact) */}
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[700px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold tracking-tight">{L.proof.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-300">{L.proof.subtitle}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROOF_STATS.map((s, i) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-5xl font-extrabold text-transparent">{s.value}</div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{L.proof.labels[i] ?? s.label}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline">
                  {L.proof.sourcePrefix} {s.source} ↗
                </a>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">{L.proof.disclaimer}</p>
        </div>
      </section>

      {/* Features / professional toolkit (bento) */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">{d.features.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{d.features.subtitle}</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {d.features.items.map((f, i) => (
            <div key={f.t} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg text-white shadow-lg shadow-indigo-500/30">
                {["📊", "📄", "🎯", "🔎", "🗂️", "🌍"][i] ?? "✦"}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why not just ChatGPT */}
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">{L.compare.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{L.compare.subtitle}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-500">{L.compare.badTitle}</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              {L.compare.bad.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <svg className="mt-0.5 h-5 w-5 flex-none text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM7.7 7.7a1 1 0 0 1 1.4 0L10 8.6l.9-.9a1 1 0 1 1 1.4 1.4l-.9.9.9.9a1 1 0 1 1-1.4 1.4l-.9-.9-.9.9a1 1 0 1 1-1.4-1.4l.9-.9-.9-.9a1 1 0 0 1 0-1.4Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-lg shadow-indigo-100">
            <h3 className="text-lg font-semibold text-indigo-700">{L.compare.goodTitle}</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {L.compare.good.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <svg className="mt-0.5 h-5 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold tracking-tight">{L.how.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">{L.how.subtitle}</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {L.how.steps.map((s, i) => (
              <div key={s.t} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700">{i + 1}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold tracking-tight">{L.testimonials.title}</h2>
          <p className="mt-2 text-center text-xs text-slate-400">{L.testimonials.note}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {L.testimonials.items.map((t) => (
              <figure key={t.n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-amber-500">★★★★★</div>
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">“{t.q}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-slate-900">{t.n}</span>
                  <span className="text-slate-500"> · {t.r}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">{L.faq.title}</h2>
        <div className="mt-10 space-y-4">
          {L.faq.items.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
                {f.q}
                <span className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA (dark) */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">{L.finalCta.title}</h2>
          <p className="mt-3 text-slate-300">{L.finalCta.subtitle}</p>
          <a href="#app" className="mt-7 inline-block rounded-xl bg-indigo-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">
            {L.finalCta.button}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-xs font-bold text-white">RT</div>
            <span>ResumeTailor</span>
          </div>
          <p>{L.footer}</p>
        </div>
      </footer>
    </div>
  );
}
