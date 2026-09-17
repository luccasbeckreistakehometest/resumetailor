"use client";

import Link from "next/link";
import { PROOF_STATS } from "./i18n/proofStats";
import { useI18n } from "./i18n/I18nProvider";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Eyebrow, H2, Rule, Stamp } from "@/components/ui";

const ATS_SYSTEMS = ["Workday", "Greenhouse", "Gupy", "Lever", "SAP SuccessFactors", "Taleo", "iCIMS"];

export default function Home() {
  const { d, x } = useI18n();
  const L = d.landing;
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero: one column of type, one live demo. Serif, ruled lines, one oxblood button. */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <Stamp>{L.hero.badge}</Stamp>
            <h1 className="font-display mt-6 text-[2.75rem] leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl lg:text-[4.4rem]">
              {L.hero.title} <span className="ink-underline">{L.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">{L.hero.subtitle}</p>
            <ul className="mt-6 space-y-2.5">
              {L.hero.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-ink-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />{b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/start" className="btn btn-primary" data-tour="nav-start">{L.form.cta}</Link>
              <Link href="/start?via=voice" className="btn btn-ghost">🎙 {x.choose.talk.t}</Link>
            </div>
            <p className="mt-4 text-sm text-muted">{L.hero.fine}</p>
            <p className="mt-2 text-sm"><Link href="/ats-check" className="font-medium text-oxblood underline-offset-4 hover:underline" data-testid="hero-ats">{x.ats.landingLink}</Link></p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -rotate-1 rounded-2xl bg-surface shadow-[var(--shadow)]" aria-hidden />
            <div className="relative rounded-2xl border border-edge bg-surface p-5">
              <Eyebrow>{L.how.steps[2].t}</Eyebrow>
              <div className="mt-3"><LiveMatchDemo /></div>
            </div>
          </div>
        </Container>
      </section>

      {/* ATS bar */}
      <section className="border-y border-edge bg-surface">
        <Container className="flex flex-col items-center gap-3 py-5 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-ink-2">{d.atsBar.title}</p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">{ATS_SYSTEMS.map((s) => <li key={s}>{s}</li>)}</ul>
        </Container>
        <p className="pb-3 text-center text-[11px] text-muted">{d.atsBar.note}</p>
      </section>

      {/* Proof: real third-party figures, each with its source */}
      <section className="bg-ink text-paper">
        <Container className="py-20">
          <div className="max-w-2xl">
            <h2 className="font-display mt-2 text-3xl sm:text-4xl">{L.proof.title}</h2>
            <p className="mt-3 text-paper-2/80">{L.proof.subtitle}</p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 sm:grid-cols-2 lg:grid-cols-5">
            {PROOF_STATS.map((s, i) => (
              <div key={s.value + i} className="bg-ink p-6">
                <p className="font-display text-4xl text-gold">{s.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-paper-2/90">{L.proof.labels[i] ?? s.label}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-paper-2/60 underline-offset-2 hover:underline">{L.proof.sourcePrefix} {s.source} ↗</a>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-xs text-paper-2/60">{L.proof.disclaimer}</p>
        </Container>
      </section>

      {/* Features */}
      <section>
        <Container className="py-20">
          <div className="max-w-2xl"><Eyebrow>ResumeTailor</Eyebrow><H2 className="mt-2">{d.features.title}</H2><p className="mt-3 text-ink-2">{d.features.subtitle}</p></div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.features.items.map((f, i) => (
              <div key={f.t} className="card p-6">
                <p className="font-display text-2xl text-oxblood">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 font-semibold text-ink">{f.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{f.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Compare */}
      <section className="border-y border-edge bg-surface">
        <Container className="py-20">
          <div className="max-w-2xl"><H2>{L.compare.title}</H2><p className="mt-3 text-ink-2">{L.compare.subtitle}</p></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-edge p-6">
              <p className="eyebrow">{L.compare.badTitle}</p>
              <ul className="mt-4 space-y-2.5">{L.compare.bad.map((b) => <li key={b} className="flex gap-3 text-sm text-muted"><span>—</span>{b}</li>)}</ul>
            </div>
            <div className="rounded-2xl border-2 border-ink p-6">
              <p className="eyebrow !text-oxblood">{L.compare.goodTitle}</p>
              <ul className="mt-4 space-y-2.5">{L.compare.good.map((b) => <li key={b} className="flex gap-3 text-sm text-ink"><span className="text-moss">✓</span>{b}</li>)}</ul>
            </div>
          </div>
        </Container>
      </section>

      {/* How */}
      <section id="how">
        <Container className="py-20">
          <div className="max-w-2xl"><H2>{L.how.title}</H2><p className="mt-3 text-ink-2">{L.how.subtitle}</p></div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {L.how.steps.map((s, i) => (
              <li key={s.t}>
                <p className="font-display text-5xl text-edge-2">{i + 1}</p>
                <Rule className="my-3" />
                <p className="font-semibold text-ink">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-edge">
        <Container className="max-w-3xl py-20">
          <H2>{L.faq.title}</H2>
          <div className="mt-8 divide-y divide-edge">
            {L.faq.items.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">{f.q}<span className="text-muted transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="bg-oxblood text-white">
        <Container className="py-20 text-center">
          <h2 className="font-display text-4xl sm:text-5xl">{L.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">{L.finalCta.subtitle}</p>
          <Link href="/start" className="btn btn-ink mt-8 !bg-paper !text-ink hover:!bg-white">{L.finalCta.button}</Link>
        </Container>
      </section>
      <SiteFooter />
    </div>
  );
}
