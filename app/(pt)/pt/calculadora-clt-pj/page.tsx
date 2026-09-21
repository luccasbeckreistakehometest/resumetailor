import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Stamp } from "@/components/ui";
import { CltPjCalculator } from "@/components/CltPjCalculator";
import { calcCopy as C } from "@/app/i18n/r3/calculator";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";
import { TABLES_2026 } from "@/lib/br/payroll2026";

export const metadata: Metadata = pageMetadata("calculator", "pt", seoCopy.pt.calculator!);

/**
 * /pt/calculadora-clt-pj — free and indexable: the explanation and the FAQ are rendered on the
 * server; the math runs in the browser with the values in the URL.
 */
export default function CalculatorPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-10)]">
        <Stamp>{C.eyebrow}</Stamp>
        <h1 className="font-display mt-4 text-4xl leading-tight text-ink sm:text-5xl">{C.h1}</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-2">{C.intro}</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted">…</p>}><CltPjCalculator /></Suspense>
        </div>
        <p className="mt-6 rounded-xl bg-gold-2 px-4 py-3 text-sm text-ink" data-testid="calc-disclaimer">{C.disclaimer}</p>
        <p className="mt-4 text-sm"><Link href="/applications" className="font-medium text-[color:var(--ink)] decoration-[var(--rule-field)] underline-offset-4 hover:underline">{C.trackerCta} →</Link></p>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-3xl text-ink">{C.faqTitle}</h2>
          <div className="mt-4 divide-y divide-edge">
            {C.faq.map((f) => (
              <details key={f.q} className="group py-4" open>
                <summary className="cursor-pointer list-none font-medium text-ink">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="mt-10 max-w-3xl text-xs text-muted">
          <p className="font-semibold uppercase tracking-wide">{C.sourcesTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{Object.values(TABLES_2026.sources).map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="mt-2">✓ {TABLES_2026.verifiedAt}</p>
        </section>
      </Container>
      <SiteFooter />
    </div>
  );
}
