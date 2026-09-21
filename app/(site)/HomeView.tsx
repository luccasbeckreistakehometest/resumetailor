"use client";

import Link from "next/link";
import { PROOF_STATS } from "@/app/i18n/proofStats";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LiveMatchDemo } from "@/components/LiveMatchDemo";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { Button, Container, Icon, Section, Seal } from "@/components/ui";
import { FeatureShowcase } from "@/components/FeatureShowcase";

// Position of "Company insights" in d.features.items (the arrays are parallel across languages).
const INSIGHTS_FEATURE = 10;
const ATS_SYSTEMS = ["Workday", "Greenhouse", "Gupy", "Lever", "SAP SuccessFactors", "Taleo", "iCIMS"];

/**
 * The landing page (surface 10). It was eleven equal bordered cards, a conic-gradient donut and an
 * oxblood call-to-action band. It is now an asymmetric 7/4 opening with the product's own Meter
 * doing the demonstrating, a contents list instead of a card grid, and an ink close — red in this
 * system is a proofreader's mark, so it never makes a band or a button.
 *
 * The "company insights" entry only shows when that feature is configured.
 */
export function HomeView() {
  const { d, x, r, to, startHref } = useI18n();
  const S = r.showcase;
  const { features } = useAuth();
  const L = d.landing;
  const items = d.features.items.filter((_, i) => features.insights || i !== INSIGHTS_FEATURE);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero: 7 columns of type, 4 for the live document. Never 50/50. */}
      <Container className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-[var(--s-9)] py-[var(--s-11)] lg:grid-cols-12 lg:py-[var(--s-12)]">
        <div className="lg:col-span-7">
          <Seal>{L.hero.badge}</Seal>
          <h1 className="doc-45 mt-[var(--s-6)] text-[color:var(--ink)] lg:text-[length:var(--doc-64)] lg:leading-[var(--doc-64-lh)] lg:tracking-[var(--doc-64-ls)]">
            {L.hero.title} <span className="ink-underline">{L.hero.titleAccent}</span>
          </h1>
          <p className="doc-18 mt-[var(--s-7)] max-w-[var(--measure)] text-[color:var(--ink-2)]">{L.hero.subtitle}</p>

          <ul className="mt-[var(--s-7)] max-w-[var(--measure)] border-t border-[var(--rule-hairline)]">
            {S.heroBullets.map((b) => (
              <li key={b} className="flex items-start gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">
                {/* The marker sits on the first line's optical centre, not on its baseline. */}
                <span aria-hidden className="mt-[11px] h-px w-[10px] shrink-0 bg-[var(--rule-field)]" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-[var(--s-8)] flex flex-wrap items-center gap-[var(--s-4)]">
            <Button href={startHref()} size="lg" data-tour="nav-start" data-testid="hero-start">{L.form.cta}</Button>
            <Button href={startHref("via=voice")} variant="outline" size="lg" icon="mic">{x.choose.talk.t}</Button>
          </div>
          <p className="mt-[var(--s-5)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{L.hero.fine}</p>
          <p className="mt-[var(--s-3)]">
            <Link href={to("ats")} className="font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]" data-testid="hero-ats">
              {x.ats.landingLink}
            </Link>
          </p>
        </div>

        <div className="lg:col-span-4 lg:col-start-9">
          <p className="eyebrow mb-[var(--s-3)]">{L.how.steps[2].t}</p>
          <LiveMatchDemo />
        </div>
      </Container>

      {/* The filters this is aimed at, named. A band, not a card. */}
      <div className="border-y border-[var(--rule)] bg-[var(--raised)]">
        <Container className="flex flex-col gap-[var(--s-3)] py-[var(--s-5)] sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)]">{d.atsBar.title}</p>
          <ul className="flex flex-wrap gap-x-[var(--s-5)] gap-y-[var(--s-1)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">
            {ATS_SYSTEMS.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </Container>
        <Container><p className="pb-[var(--s-3)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{d.atsBar.note}</p></Container>
      </div>

      {/* Proof: third-party figures, each with its source. The one inverted band on the page. */}
      <div className="bg-[var(--ink)] text-[color:var(--on-ink)]">
        <Container>
          <Section>
            <div className="max-w-[var(--measure)]">
              <h2 className="doc-31">{L.proof.title}</h2>
              <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] opacity-75">{L.proof.subtitle}</p>
            </div>
            <dl className="mt-[var(--s-9)] grid gap-x-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-5">
              {PROOF_STATS.map((s, i) => (
                <div key={s.value + i} className="border-t border-[color-mix(in_srgb,var(--on-ink)_22%,transparent)] py-[var(--s-5)]">
                  <dt className="font-mono text-[length:var(--mn-24)] font-medium tabular-nums tracking-[var(--mn-24-ls)]">{s.value}</dt>
                  <dd>
                    <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] opacity-85">{L.proof.labels[i] ?? s.label}</p>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-[var(--s-3)] inline-flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-12)] opacity-60 underline-offset-2 hover:underline hover:opacity-100">
                      {L.proof.sourcePrefix} {s.source}<Icon name="external" size={16} />
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-[var(--s-7)] max-w-[var(--measure)] font-sans text-[length:var(--ui-12)] leading-[var(--ui-12-lh)] opacity-55">{L.proof.disclaimer}</p>
          </Section>
        </Container>
      </div>

      {/* What is in it: a contents page, not a card grid. */}
      <Container>
        <Section>
          <div className="grid gap-[var(--gutter)] md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="eyebrow">ResumeTailor</p>
              <h2 className="doc-31 mt-[var(--s-3)] text-[color:var(--ink)]">{d.features.title}</h2>
              <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{d.features.subtitle}</p>
            </div>
            <ol className="border-t border-[var(--rule)] md:col-span-7 md:col-start-6 md:columns-2 md:gap-[var(--gutter)]">
              {items.map((f, i) => (
                <li key={f.t} className="break-inside-avoid border-b border-[var(--rule-hairline)] py-[var(--s-5)]">
                  <div className="flex gap-[var(--s-4)]">
                    <span className="mt-[2px] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-40)]">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{f.t}</p>
                      <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{f.d}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </Container>

      {/* Round 3: the proof-first tools, and the way to everything else */}
      <div className="border-t border-[var(--rule)] bg-[var(--raised)]" data-testid="home-new">
        <Container>
          <Section>
            <div className="max-w-[var(--measure)]">
              <p className="eyebrow">{S.whatsNew.replace(":", "")}</p>
              <h2 className="doc-31 mt-[var(--s-3)] text-[color:var(--ink)]">{S.positioning}</h2>
            </div>
            <div className="mt-[var(--s-8)]"><FeatureShowcase keys={["truth", "human", "numbers", "editor", "compare", "pitch", "tracker", "intl", "calculator"]} testId="home-showcase" /></div>
            <div className="mt-[var(--s-7)] flex flex-wrap items-center gap-[var(--s-5)]">
              <Button href={to("tools")} variant="outline" iconEnd icon="arrow-right" data-testid="home-hub">{S.seeAll}</Button>
              <span className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{S.noSub}</span>
            </div>
          </Section>
        </Container>
      </div>

      {/* Before and after, as two marked-up columns */}
      <Container>
        <Section>
          <div className="max-w-[var(--measure)]">
            <h2 className="doc-31 text-[color:var(--ink)]">{L.compare.title}</h2>
            <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{L.compare.subtitle}</p>
          </div>
          <div className="mt-[var(--s-8)] grid gap-[var(--s-8)] lg:grid-cols-2 lg:gap-[var(--gutter)]">
            <div>
              <p className="eyebrow border-b border-[var(--rule)] pb-[var(--s-3)]">{L.compare.badTitle}</p>
              <ul>
                {L.compare.bad.map((b) => (
                  <li key={b} className="flex items-start gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">
                    <span aria-hidden className="mt-[10px] h-px w-[10px] shrink-0 bg-[var(--rule-field)]" />{b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow border-b-2 border-[var(--ink)] pb-[var(--s-3)] text-[color:var(--ink)]">{L.compare.goodTitle}</p>
              <ul>
                {L.compare.good.map((b) => (
                  <li key={b} className="flex items-start gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-4)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">
                    <Icon name="check" size={16} className="relative top-[2px] text-[color:var(--kept)]" />{b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </Container>

      {/* How */}
      <div id="how" className="border-t border-[var(--rule)]">
        <Container>
          <Section>
            <div className="max-w-[var(--measure)]">
              <h2 className="doc-31 text-[color:var(--ink)]">{L.how.title}</h2>
              <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{L.how.subtitle}</p>
            </div>
            <ol className="mt-[var(--s-9)] grid gap-[var(--s-8)] md:grid-cols-3 md:gap-[var(--gutter)]">
              {L.how.steps.map((s, i) => (
                <li key={s.t} className="border-t border-[var(--rule)] pt-[var(--s-4)]">
                  <p className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-40)]">{String(i + 1).padStart(2, "0")}</p>
                  <p className="doc-21 mt-[var(--s-4)] text-[color:var(--ink)]">{s.t}</p>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{s.d}</p>
                </li>
              ))}
            </ol>
          </Section>
        </Container>
      </div>

      {/* FAQ */}
      <div className="border-t border-[var(--rule)]">
        <Container>
          <Section>
            <div className="grid gap-[var(--gutter)] md:grid-cols-12">
              <h2 className="doc-31 text-[color:var(--ink)] md:col-span-4">{L.faq.title}</h2>
              <div className="border-t border-[var(--rule)] md:col-span-7 md:col-start-6">
                {L.faq.items.map((f) => (
                  <details key={f.q} className="group border-b border-[var(--rule-hairline)] py-[var(--s-5)]">
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-[var(--s-5)] font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink)]">
                      {f.q}
                      <span className="relative top-[3px] shrink-0 text-[color:var(--ink-muted)] group-open:hidden"><Icon name="plus" size={16} /></span>
                      <span className="relative top-[3px] hidden shrink-0 text-[color:var(--ink-muted)] group-open:block"><Icon name="minus" size={16} /></span>
                    </summary>
                    <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Section>
        </Container>
      </div>

      {/* The close. Ink, because red is a mark. */}
      <div className="bg-[var(--ink)] text-[color:var(--on-ink)]">
        <Container>
          <Section className="grid gap-[var(--s-7)] md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <h2 className="doc-31 lg:text-[length:var(--doc-45)] lg:leading-[var(--doc-45-lh)] lg:tracking-[var(--doc-45-ls)]">{L.finalCta.title}</h2>
              <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] opacity-80">{L.finalCta.subtitle}</p>
            </div>
            <div className="md:col-span-4 md:col-start-9 md:text-right">
              <Link
                href={startHref() as never}
                className="inline-flex h-[calc(var(--control-h)+8px)] items-center justify-center rounded-[var(--r-2)] bg-[var(--on-ink)] px-[var(--s-8)] font-sans text-[length:var(--ui-17)] font-semibold text-[color:var(--ink)] transition-opacity hover:opacity-90"
              >
                {L.finalCta.button}
              </Link>
            </div>
          </Section>
        </Container>
      </div>

      <SiteFooter />
    </div>
  );
}
