"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";

export function SiteFooter() {
  const { d, x } = useI18n();
  void d;
  return (
    <footer className="border-t border-edge py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 text-sm text-muted sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-lg text-ink">ResumeTailor</p>
          <p className="mt-1 max-w-sm">{x.footer}</p>
        </div>
        <nav className="flex flex-wrap gap-5">
          <Link href="/pricing" className="hover:text-ink">{x.nav.pricing}</Link>
          <Link href="/library" className="hover:text-ink">{d.nav.myCVs}</Link>
          <Link href="/applications" className="hover:text-ink">{x.nav.applications}</Link>
          <Link href="/start" className="hover:text-ink">{d.nav.start}</Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} ResumeTailor</p>
      </div>
    </footer>
  );
}
