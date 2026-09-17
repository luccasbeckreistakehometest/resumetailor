"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useAuth } from "@/components/AuthProvider";

/** The payment line says only what this server can actually do. */
export function usePaymentLine(): string {
  const { l } = useI18n();
  const { payments } = useAuth();
  if (payments.stripe && payments.mercadopago) return l.footer.payBoth;
  if (payments.mercadopago) return l.footer.payMp;
  if (payments.stripe) return l.footer.payStripe;
  return l.footer.payNone;
}

export function SiteFooter() {
  const { d, x, l } = useI18n();
  const payLine = usePaymentLine();
  return (
    <footer className="mt-auto border-t border-edge py-10" data-testid="site-footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 text-sm text-muted sm:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg text-ink">ResumeTailor</p>
          <p className="mt-1 max-w-sm" data-testid="footer-payments">{payLine}</p>
          <p className="mt-1 max-w-sm">{l.footer.prepaid}</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="ResumeTailor">
          <Link href="/ats-check" className="hover:text-ink">{x.nav.atsCheck}</Link>
          <Link href="/fit" className="hover:text-ink">{x.nav.fit}</Link>
          <Link href="/pricing" className="hover:text-ink">{x.nav.pricing}</Link>
          <Link href="/library" className="hover:text-ink">{d.nav.myCVs}</Link>
          <Link href="/applications" className="hover:text-ink">{x.nav.applications}</Link>
          <Link href="/start" className="hover:text-ink">{d.nav.start}</Link>
        </nav>
        <LegalLinks />
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-5 text-xs text-muted">© {new Date().getFullYear()} ResumeTailor</p>
    </footer>
  );
}

export function LegalLinks({ inline = false }: { inline?: boolean }) {
  const { l } = useI18n();
  return (
    <nav className={inline ? "flex flex-wrap justify-center gap-x-4 gap-y-1" : "flex flex-col gap-2"} aria-label={l.footer.legal} data-testid="legal-links">
      <Link href="/legal/privacy" className="hover:text-ink">{l.footer.privacy}</Link>
      <Link href="/legal/terms" className="hover:text-ink">{l.footer.terms}</Link>
      <Link href="/legal/refunds" className="hover:text-ink">{l.footer.refunds}</Link>
      <Link href="/legal/cookies" className="hover:text-ink">{l.footer.cookies}</Link>
      <Link href="/contact" className="hover:text-ink">{l.footer.contact}</Link>
    </nav>
  );
}
