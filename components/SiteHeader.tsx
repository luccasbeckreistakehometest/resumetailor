"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { useDialog } from "@/components/useDialog";
import { Portal } from "@/components/Portal";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ResumeTailor">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-ink font-display text-lg leading-none text-paper">R</span>
      <span className="font-display text-xl tracking-tight text-ink">Resume<span className="text-oxblood">Tailor</span></span>
    </Link>
  );
}

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { d, x, l } = useI18n();
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Logo />
        {!minimal && (
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-2 md:flex" aria-label={l.menu.title}>
            <Link href="/ats-check" className="hover:text-ink" data-testid="nav-ats">{x.nav.atsCheck}</Link>
            <Link href="/fit" className="hover:text-ink" data-testid="nav-fit">{x.nav.fit}</Link>
            <Link href="/pricing" className="hover:text-ink">{x.nav.pricing}</Link>
            <Link href="/library" className="hover:text-ink" data-tour="nav-library">{d.nav.myCVs}</Link>
            <Link href="/applications" className="hover:text-ink" data-testid="nav-applications">{x.nav.applications}</Link>
            {user?.role === "admin" && <Link href="/admin" className="hover:text-ink">Admin</Link>}
          </nav>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* The tour's "credits" step lands here whether or not anyone is signed in. */}
          <div className="flex items-center gap-3" data-tour="credits">
            {user && <Link href="/account" className="rounded-full bg-gold-2 px-2.5 py-1 text-xs font-semibold text-ink" data-testid="credits">{x.credits.badge(user.credits)}</Link>}
            <AuthButton />
          </div>
          <div className="hidden md:block"><LanguageSwitcher /></div>
          {!minimal && <Link href="/start" className="btn btn-primary hidden !py-2 !text-sm md:inline-flex" data-tour="nav-start">{d.nav.start}</Link>}
          <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-edge-2 text-ink md:hidden" aria-label={l.menu.open} aria-expanded={menu} aria-haspopup="dialog" data-testid="menu-open">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>
      {menu && <Portal><MobileMenu minimal={minimal} onClose={() => setMenu(false)} /></Portal>}
    </header>
  );
}

/** Below md: everything the desktop header offers — navigation, credits, account, language, sign out. */
function MobileMenu({ onClose, minimal }: { onClose: () => void; minimal: boolean }) {
  const { d, x, l } = useI18n();
  const { user, signOut } = useAuth();
  const ref = useDialog<HTMLDivElement>(onClose);
  const link = "block rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-paper-2";
  const openAuth = (mode: "in" | "up") => { onClose(); window.setTimeout(() => window.dispatchEvent(new CustomEvent("rt:auth", { detail: mode })), 0); };
  return (
    <div className="fixed inset-0 z-[70] bg-ink/50 md:hidden" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={l.menu.title} className="ml-auto flex h-full w-[min(88vw,360px)] flex-col overflow-y-auto bg-surface p-4 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="mobile-menu">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{l.menu.title}</span>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-paper-2" aria-label={l.menu.close} data-testid="menu-close">✕</button>
        </div>
        {user && (
          <div className="mt-3 rounded-xl border border-edge bg-paper p-3">
            <p className="text-xs text-muted">{l.menu.signedInAs}</p>
            <p className="truncate text-sm font-medium text-ink">{user.email}</p>
            <p className="mt-1 text-sm text-ink-2" data-testid="menu-credits">{x.credits.badge(user.credits)}</p>
          </div>
        )}
        <nav className="mt-3 flex flex-col" aria-label={l.menu.title} onClick={onClose}>
          {!minimal && <Link href="/start" className="btn btn-primary mb-2 w-full">{l.menu.start}</Link>}
          <Link href="/ats-check" className={link}>{x.nav.atsCheck}</Link>
          <Link href="/fit" className={link}>{x.nav.fit}</Link>
          <Link href="/pricing" className={link}>{x.nav.pricing}</Link>
          <Link href="/library" className={link} data-testid="menu-library">{d.nav.myCVs}</Link>
          <Link href="/applications" className={link}>{x.nav.applications}</Link>
          <Link href="/interview" className={link}>{x.interview.sessionsTitle}</Link>
          {user && <Link href="/account" className={link} data-testid="menu-account">{l.menu.account}</Link>}
          {user?.role === "admin" && <Link href="/admin" className={link}>{l.menu.admin}</Link>}
          <Link href="/contact" className={link}>{l.footer.contact}</Link>
        </nav>
        <div className="mt-4"><LanguageSwitcher /></div>
        <div className="mt-auto border-t border-edge pt-4">
          {user ? (
            <button type="button" onClick={() => { onClose(); void signOut(); }} className="btn btn-ghost w-full" data-testid="menu-signout">{x.nav.signOut}</button>
          ) : (
            <div className="grid gap-2">
              <button type="button" onClick={() => openAuth("in")} className="btn btn-ghost w-full" data-testid="menu-signin">{x.nav.signIn}</button>
              <button type="button" onClick={() => openAuth("up")} className="btn btn-ink w-full">{x.auth.signUp}</button>
            </div>
          )}
          <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <Link href="/legal/privacy" onClick={onClose}>{l.footer.privacy}</Link>
            <Link href="/legal/terms" onClick={onClose}>{l.footer.terms}</Link>
            <Link href="/legal/refunds" onClick={onClose}>{l.footer.refunds}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
