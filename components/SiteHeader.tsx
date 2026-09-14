"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ResumeTailor">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-lg leading-none text-paper">R</span>
      <span className="font-display text-xl tracking-tight text-ink">Resume<span className="text-oxblood">Tailor</span></span>
    </Link>
  );
}

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { d, x } = useI18n();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Logo />
        {!minimal && (
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-2 md:flex">
            <Link href="/pricing" className="hover:text-ink">{x.nav.pricing}</Link>
            <Link href="/library" className="hover:text-ink" data-tour="nav-library">{d.nav.myCVs}</Link>
            {user?.role === "admin" && <Link href="/admin" className="hover:text-ink">Admin</Link>}
          </nav>
        )}
        <div className="flex items-center gap-3">
          {/* The tour's "credits" step lands here whether or not anyone is signed in. */}
          <div className="flex items-center gap-3" data-tour="credits">
            {user && <span className="hidden rounded-full bg-gold-2 px-2.5 py-1 text-xs font-semibold text-ink sm:inline" data-testid="credits">{x.credits.badge(user.credits)}</span>}
            <AuthButton />
          </div>
          <LanguageSwitcher />
          {!minimal && <Link href="/start" className="btn btn-primary hidden !py-2 !text-sm sm:inline-flex" data-tour="nav-start">{d.nav.start}</Link>}
        </div>
      </div>
    </header>
  );
}
