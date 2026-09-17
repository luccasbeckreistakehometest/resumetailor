"use client";

import Link from "next/link";
import { PROOF_STATS } from "@/app/i18n/proofStats";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";
import { Container, Stamp } from "@/components/ui";

import type { AngleKey } from "./angles";
import { LegalLinks } from "@/components/SiteFooter";

/** Ad landing: one angle, one CTA, nothing to wander off to. */
export function LpView({ angle: key }: { angle: AngleKey }) {
  const { d, lang } = useI18n();
  const a = d.lp.angles[key];
  const via = key === "firstjob" ? "?via=voice" : "";
  return (
    <div className="min-h-screen">
      <SiteHeader minimal />
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <Stamp>{d.landing.hero.badge}</Stamp>
          <h1 className="font-display mt-6 text-5xl leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl">{a.title}</h1>
          <p className="mt-6 text-lg text-ink-2">{a.subtitle}</p>
          <ul className="mt-6 space-y-2.5">{a.bullets.map((b) => <li key={b} className="flex items-start gap-3 text-ink-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />{b}</li>)}</ul>
          <Link href={`/start${via}`} className="btn btn-primary mt-8 !px-7 !py-4 !text-base">{d.lp.cta}</Link>
          <p className="mt-3 text-sm text-muted">{d.lp.secondary}</p>
          <p className="mt-4 text-sm"><Link href={lang === "en" ? "/ats-check" : `/ats-check/${lang}`} className="font-medium text-oxblood underline-offset-4 hover:underline" data-testid="lp-ats">{d.lp.atsCta}</Link></p>
        </div>
        <div className="card p-5"><LiveMatchDemo /></div>
      </Container>
      <section className="border-t border-edge bg-surface">
        <Container className="grid gap-6 py-10 sm:grid-cols-3">
          {PROOF_STATS.slice(0, 3).map((s, i) => (
            <div key={i}><p className="font-display text-3xl text-oxblood">{s.value}</p><p className="mt-1 text-sm text-ink-2">{d.landing.proof.labels[i] ?? s.label}</p><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline-offset-2 hover:underline">{d.landing.proof.sourcePrefix} {s.source}</a></div>
          ))}
        </Container>
      </section>
      {/* Ad landings keep one path forward; the footer carries only what the law asks for. */}
      <footer className="border-t border-edge py-6 text-xs text-muted"><LegalLinks inline /></footer>
    </div>
  );
}
