"use client";

import Link from "next/link";
import { PROOF_STATS } from "@/app/i18n/proofStats";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ANGLE_CONTENT, type FreeTool } from "@/app/i18n/r3/angles";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { Container, H2, Stamp } from "@/components/ui";
import { LegalLinks } from "@/components/SiteFooter";
import { PACKS } from "@/lib/packs";
import { track } from "@/lib/client/track";
import type { AngleKey } from "./angles";

const TOOL_ROUTE: Record<FreeTool, string> = { ats: "ats", fit: "fit", compare: "compare", calculator: "calculator" };

/** Ad landing: one angle, one path forward — the kit, the free tools, the price, the questions. */
export function LpView({ angle: key }: { angle: AngleKey }) {
  const { d, r, x, lang, to, startHref } = useI18n();
  const a = r.lp.angles[key as "layoff"] ?? d.lp.angles[key as "jobseeker"];
  const S = r.showcase;
  const content = ANGLE_CONTENT[key];
  const via = key === "firstjob" || key === "interview" ? "via=voice" : "";
  const cta = (position: string) => () => track("cta_click", { angle: key, position });
  const price = lang === "pt" ? `R$ ${PACKS[0].brl}` : `$${PACKS[0].usd}`;
  const free = content.free.filter((t) => t !== "calculator" || lang === "pt");
  const faq = [...(r.angleFaq.specific[key] ? [r.angleFaq.specific[key]!] : []), ...r.angleFaq.base];
  return (
    <div className="min-h-screen">
      <SiteHeader minimal />
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <Stamp>{d.landing.hero.badge}</Stamp>
          <h1 className="font-display mt-6 text-5xl leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl">{a.title}</h1>
          <p className="mt-6 text-lg text-ink-2">{a.subtitle}</p>
          <ul className="mt-6 space-y-2.5">{a.bullets.map((b) => <li key={b} className="flex items-start gap-3 text-ink-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />{b}</li>)}</ul>
          <Link href={startHref(via)} onClick={cta("hero")} className="btn btn-primary mt-8 !px-7 !py-4 !text-base" data-testid="lp-cta">{d.lp.cta}</Link>
          <p className="mt-3 text-sm text-muted">{d.lp.secondary}</p>
          <p className="mt-4 text-sm"><Link href={to("ats")} onClick={cta("ats")} className="font-medium text-[color:var(--ink)] decoration-[var(--rule-field)] underline-offset-4 hover:underline" data-testid="lp-ats">{d.lp.atsCta}</Link></p>
        </div>
        <div className="card p-5"><LiveMatchDemo /></div>
      </Container>

      <section className="border-t border-edge">
        <Container className="py-16">
          <H2>{S.kitTitle}</H2>
          <div className="mt-8"><FeatureShowcase keys={content.features} /></div>
        </Container>
      </section>

      <section className="border-y border-edge bg-surface" data-testid="lp-free">
        <Container className="py-12">
          <p className="font-display text-3xl text-ink">{S.freeTitle}</p>
          <p className="mt-1 text-ink-2">{S.freeIntro}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {free.map((t) => <Link key={t} href={to(TOOL_ROUTE[t])} onClick={cta(`free-${t}`)} className="btn btn-ghost">{S.cards[t].t} →</Link>)}
          </div>
        </Container>
      </section>

      <section>
        <Container className="grid gap-8 py-16 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border-2 border-ink p-6" data-testid="lp-price">
            <p className="font-display text-3xl text-ink">{S.priceTitle}</p>
            <p className="mt-2 text-lg text-ink-2">{S.priceLine(price)}</p>
            <p className="mt-1 font-semibold text-moss">{S.noSub}</p>
            <Link href={to("pricing")} onClick={cta("pricing")} className="btn btn-ink mt-5">{x.nav.pricing} · {price}</Link>
          </div>
          <div>
            <p className="eyebrow">{S.faqTitle}</p>
            <div className="mt-2 divide-y divide-edge" data-testid="lp-faq">
              {faq.map((f) => (
                <details key={f.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">{f.q}<span className="text-muted transition group-open:rotate-45">+</span></summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-edge bg-surface">
        <Container className="grid gap-6 py-10 sm:grid-cols-3">
          {PROOF_STATS.slice(0, 3).map((s, i) => (
            <div key={i}><p className="font-display text-3xl text-[color:var(--ink)] decoration-[var(--rule-field)]">{s.value}</p><p className="mt-1 text-sm text-ink-2">{d.landing.proof.labels[i] ?? s.label}</p><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline-offset-2 hover:underline">{d.landing.proof.sourcePrefix} {s.source}</a></div>
          ))}
        </Container>
      </section>

      <section className="bg-[var(--ink)] text-[color:var(--on-ink)]">
        <Container className="py-14 text-center">
          <p className="font-display text-3xl sm:text-4xl">{a.title}</p>
          <Link href={startHref(via)} onClick={cta("final")} className="btn mt-6 bg-[var(--on-ink)] text-[color:var(--ink)] hover:opacity-90">{S.ctaFinal}</Link>
          <p className="mt-3 text-sm opacity-80">{S.noSub}</p>
        </Container>
      </section>
      {/* Ad landings keep one path forward; the footer carries only what the law asks for. */}
      <footer className="border-t border-edge py-6 text-xs text-muted"><LegalLinks inline /></footer>
    </div>
  );
}
