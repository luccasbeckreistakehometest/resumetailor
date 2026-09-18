"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { Container, Logo } from "@/components/ui";

/** The payment line says only what this server can actually do. */
export function usePaymentLine(): string {
  const { l } = useI18n();
  const { payments } = useAuth();
  if (payments.stripe && payments.mercadopago) return l.footer.payBoth;
  if (payments.mercadopago) return l.footer.payMp;
  if (payments.stripe) return l.footer.payStripe;
  return l.footer.payNone;
}

const col = "flex flex-col gap-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]";
const link = "hover:text-[color:var(--ink)]";

/**
 * The colophon (surface 4). Three link columns on the editorial grid, the payment truth in the
 * first, and one rule between the body and the year — the shape a printed page ends with, not a
 * fourth pile of cards.
 */
export function SiteFooter() {
  const { d, x, l, r, to, startHref } = useI18n();
  const payLine = usePaymentLine();
  return (
    <footer className="mt-auto border-t border-[var(--rule)] pt-[var(--s-10)] pb-[var(--s-8)]" data-testid="site-footer">
      <Container>
        <div className="grid gap-[var(--s-9)] md:grid-cols-12 md:gap-x-[var(--gutter)]">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-[var(--s-5)] max-w-[42ch] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]" data-testid="footer-payments">
              {payLine}
            </p>
            <p className="mt-[var(--s-2)] max-w-[42ch] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">
              {l.footer.prepaid}
            </p>
          </div>

          <nav className={`md:col-span-3 lg:col-span-2 lg:col-start-7 ${col}`} aria-label={r.showcase.navLabel}>
            <p className="eyebrow">{r.showcase.navLabel}</p>
            <Link href={to("ats")} className={link}>{x.nav.atsCheck}</Link>
            <Link href={to("fit")} className={link}>{x.nav.fit}</Link>
            <Link href={to("compare")} className={link}>{r.compare.navLabel}</Link>
            <Link href={to("pricing")} className={link}>{x.nav.pricing}</Link>
          </nav>

          <nav className={`md:col-span-2 lg:col-span-2 ${col}`} aria-label={l.menu.account}>
            <p className="eyebrow">{l.menu.account}</p>
            <Link href={startHref()} className={link}>{d.nav.start}</Link>
            <Link href="/library" className={link}>{d.nav.myCVs}</Link>
            <Link href="/applications" className={link}>{x.nav.applications}</Link>
          </nav>

          <div className="md:col-span-2"><LegalLinks /></div>
        </div>

        <div className="mt-[var(--s-9)] flex flex-wrap items-baseline justify-between gap-[var(--s-4)] border-t border-[var(--rule-hairline)] pt-[var(--s-5)]">
          <p className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">© {new Date().getFullYear()} ResumeTailor</p>
          <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{d.nav.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}

export function LegalLinks({ inline = false }: { inline?: boolean }) {
  const { l } = useI18n();
  return (
    <nav
      className={inline ? "flex flex-wrap justify-center gap-x-[var(--s-5)] gap-y-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]" : col}
      aria-label={l.footer.legal}
      data-testid="legal-links"
    >
      {!inline && <p className="eyebrow">{l.footer.legal}</p>}
      <Link href="/legal/privacy" className={link}>{l.footer.privacy}</Link>
      <Link href="/legal/terms" className={link}>{l.footer.terms}</Link>
      <Link href="/legal/refunds" className={link}>{l.footer.refunds}</Link>
      <Link href="/legal/cookies" className={link}>{l.footer.cookies}</Link>
      <Link href="/contact" className={link}>{l.footer.contact}</Link>
    </nav>
  );
}
