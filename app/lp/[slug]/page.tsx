"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PROOF_STATS } from "@/app/i18n/proofStats";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type AngleKey = "jobseeker" | "firstjob" | "careerchange" | "vschatgpt";
const ANGLES: AngleKey[] = ["jobseeker", "firstjob", "careerchange", "vschatgpt"];

export default function AdLandingPage() {
  const { d } = useI18n();
  const params = useParams();
  const raw = (Array.isArray(params.slug) ? params.slug[0] : params.slug) || "jobseeker";
  const key: AngleKey = (ANGLES.includes(raw as AngleKey) ? raw : "jobseeker") as AngleKey;
  const a = d.lp.angles[key];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Minimal header — no nav, keep focus on the single CTA */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">RT</div>
            <span className="text-base font-semibold tracking-tight">ResumeTailor</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-50 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-5 py-14 text-center sm:py-20">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {d.landing.hero.badge}
          </div>
          <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">{a.title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">{a.subtitle}</p>

          <ul className="mx-auto mt-7 flex max-w-xl flex-col items-start gap-3 text-left text-sm text-slate-700 sm:flex-row sm:justify-center sm:gap-6">
            {a.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <svg className="h-5 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                </svg>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <Link
              href="/start"
              className="inline-block rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              {d.lp.cta}
            </Link>
            <p className="mt-3 text-xs text-slate-400">{d.lp.secondary}</p>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-6 px-5 sm:grid-cols-4">
          {PROOF_STATS.slice(0, 4).map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-indigo-600">{s.value}</div>
              <p className="mt-1 text-xs leading-snug text-slate-600">{d.landing.proof.labels[i] ?? s.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl px-5 text-center text-[11px] text-slate-400">{d.landing.proof.disclaimer}</p>
      </section>

      {/* Final CTA */}
      <section className="bg-indigo-600">
        <div className="mx-auto max-w-2xl px-5 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{d.landing.finalCta.title}</h2>
          <p className="mt-3 text-indigo-100">{d.landing.finalCta.subtitle}</p>
          <Link href="/start" className="mt-7 inline-block rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
            {d.lp.cta}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">{d.landing.footer}</footer>
    </div>
  );
}
