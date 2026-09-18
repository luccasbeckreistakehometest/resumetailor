"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { useDialog } from "@/components/useDialog";
import { Portal } from "@/components/Portal";
import { Button, Icon, Logo } from "@/components/ui";

/**
 * The masthead (docs/DESIGN.md §12, surface 4). What it fixes: seven primary links plus a language
 * switch plus two buttons wrapped onto a second row in pt-BR, and nothing said which page you were
 * on. Now: five public links at most, the account's own pages behind an account menu, a current
 * marker under the live one, and the collapse at 1100px — the width where the PORTUGUESE strings
 * stop fitting, not the width where the English ones do.
 */

function NavLink({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) {
  const pathname = usePathname();
  const current = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href as never}
      aria-current={current ? "page" : undefined}
      className={
        "relative flex h-[var(--header-h)] items-center font-sans text-[length:var(--ui-15)] transition-colors duration-[var(--dur-1)] " +
        (current
          ? "font-medium text-[color:var(--ink)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:bg-[var(--ink)] after:content-['']"
          : "text-[color:var(--ink-2)] hover:text-[color:var(--ink)]")
      }
      {...rest}
    >
      {children}
    </Link>
  );
}

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { d, x, l, r, to, startHref } = useI18n();
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[var(--page)]">
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-[var(--page-max)] items-center gap-[var(--s-6)] px-[var(--s-5)] sm:px-[var(--s-7)]">
        <Logo />

        {!minimal && (
          <nav
            className="hidden h-full min-w-0 items-center gap-[var(--s-7)] border-l border-[var(--rule-hairline)] pl-[var(--s-6)] min-[1100px]:flex"
            aria-label={l.menu.title}
          >
            <NavLink href={to("ats")} data-testid="nav-ats">{x.nav.atsCheck}</NavLink>
            <NavLink href={to("fit")} data-testid="nav-fit">{x.nav.fit}</NavLink>
            <NavLink href={to("compare")} data-testid="nav-compare">{r.compare.navLabel}</NavLink>
            <NavLink href={to("tools")} data-testid="nav-tools">{r.showcase.navLabel}</NavLink>
            <NavLink href={to("pricing")}>{x.nav.pricing}</NavLink>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-[var(--s-4)]">
          {/* The tour's "credits" step lands here whether or not anyone is signed in. */}
          <div className="flex items-center gap-[var(--s-4)]" data-tour="credits">
            {user && (
              <Link
                href="/account"
                data-testid="credits"
                className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-2)] hover:text-[color:var(--ink)]"
              >
                {x.credits.badge(user.credits)}
              </Link>
            )}
            {user ? (
              <AccountMenu open={account} onOpen={() => setAccount(true)} onClose={() => setAccount(false)} />
            ) : (
              <AuthButton />
            )}
          </div>

          <div className="hidden min-[1100px]:block"><LanguageSwitcher /></div>

          {/* The wrapper carries the breakpoint: `hidden` on the Button itself would fight the
              variant's own `inline-flex`, and one of the two wins by stylesheet order, not intent. */}
          {!minimal && (
            <span className="hidden min-[1100px]:block">
              <Button href={startHref()} size="sm" data-tour="nav-start">{d.nav.start}</Button>
            </span>
          )}

          <button
            type="button"
            onClick={() => setMenu(true)}
            className="grid h-[var(--control-h)] w-[var(--control-h)] place-items-center rounded-[var(--r-2)] border border-[var(--rule-field)] text-[color:var(--ink)] hover:bg-[var(--sunken)] min-[1100px]:hidden"
            aria-label={l.menu.open}
            aria-expanded={menu}
            aria-haspopup="dialog"
            data-testid="menu-open"
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>
      {menu && <Portal><MobileMenu minimal={minimal} onClose={() => setMenu(false)} /></Portal>}
    </header>
  );
}

/**
 * Everything that belongs to one person — their kits, their applications, their practice, their
 * account — behind their own name, so the public navigation stays five items wide.
 */
function AccountMenu({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const { d, x, l } = useI18n();
  const { user, signOut } = useAuth();
  const ref = useDialog<HTMLDivElement>(onClose);
  if (!user) return null;
  const name = user.name || user.email.split("@")[0];
  const item =
    "flex items-center justify-between gap-[var(--s-5)] px-[var(--s-5)] py-[var(--s-3)] font-sans text-[length:var(--ui-15)] text-[color:var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="nav-account"
        className="flex max-w-[180px] items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-15)] font-medium text-[color:var(--ink-2)] hover:text-[color:var(--ink)]"
      >
        <span className="truncate">{name}</span>
        <Icon name="chevron-down" size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div
          ref={ref}
          role="menu"
          aria-label={l.menu.account}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[248px] rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] py-[var(--s-2)]"
          style={{ boxShadow: "var(--shadow-pop)" }}
          data-testid="account-menu"
        >
          <p className="px-[var(--s-5)] pb-[var(--s-2)] pt-[var(--s-2)]">
            <span className="eyebrow">{l.menu.signedInAs}</span>
            <span className="mt-[2px] block truncate font-mono text-[length:var(--mn-13)] text-[color:var(--ink-2)]">{user.email}</span>
          </p>
          <hr className="my-[var(--s-2)] h-px border-0 bg-[var(--rule-hairline)]" />
          <Link href="/library" className={item} role="menuitem" onClick={onClose} data-tour="nav-library">{d.nav.myCVs}</Link>
          <Link href="/applications" className={item} role="menuitem" onClick={onClose} data-testid="nav-applications">{x.nav.applications}</Link>
          <Link href="/interview" className={item} role="menuitem" onClick={onClose}>{x.interview.sessionsTitle}</Link>
          <Link href="/account" className={item} role="menuitem" onClick={onClose}>{l.menu.account}</Link>
          {user.role === "admin" && <Link href="/admin" className={item} role="menuitem" onClick={onClose}>{l.menu.admin}</Link>}
          <hr className="my-[var(--s-2)] h-px border-0 bg-[var(--rule-hairline)]" />
          <button type="button" role="menuitem" onClick={() => { onClose(); void signOut(); }} className={`${item} w-full`} data-testid="signout">
            {x.nav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

/** Below 1100: the same navigation as a right-hand drawer, in the same order as the header. */
function MobileMenu({ onClose, minimal }: { onClose: () => void; minimal: boolean }) {
  const { d, x, l, r, lang, to, startHref } = useI18n();
  const { user, signOut } = useAuth();
  const ref = useDialog<HTMLDivElement>(onClose);
  const link =
    "flex min-h-[44px] items-center border-b border-[var(--rule-hairline)] font-sans text-[length:var(--ui-15)] text-[color:var(--ink-2)] hover:text-[color:var(--ink)]";
  const openAuth = (mode: "in" | "up") => {
    onClose();
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("rt:auth", { detail: mode })), 0);
  };
  return (
    <div className="fixed inset-0 z-[70] bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] min-[1100px]:hidden" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={l.menu.title}
        className="ml-auto flex h-full w-[min(88vw,380px)] flex-col overflow-y-auto border-l border-[var(--rule)] bg-[var(--page)] px-[var(--s-6)] pb-[var(--s-6)]"
        onClick={(e) => e.stopPropagation()}
        data-testid="mobile-menu"
      >
        <div className="sticky top-0 z-10 -mx-[var(--s-6)] flex h-[var(--header-h)] items-center justify-between border-b border-[var(--rule)] bg-[var(--page)] px-[var(--s-6)]">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="grid h-[var(--control-h)] w-[var(--control-h)] place-items-center rounded-[var(--r-2)] text-[color:var(--ink-2)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]"
            aria-label={l.menu.close}
            data-testid="menu-close"
          >
            <Icon name="close" />
          </button>
        </div>

        {user && (
          <div className="border-b border-[var(--rule-hairline)] py-[var(--s-5)]">
            <p className="eyebrow">{l.menu.signedInAs}</p>
            <p className="mt-[2px] truncate font-mono text-[length:var(--mn-13)] text-[color:var(--ink)]">{user.email}</p>
            <p className="mt-[var(--s-2)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]" data-testid="menu-credits">
              {x.credits.badge(user.credits)}
            </p>
          </div>
        )}

        {!minimal && (
          <div className="py-[var(--s-5)]">
            <Button href={startHref()} className="w-full" onClick={onClose}>{l.menu.start}</Button>
          </div>
        )}

        <nav aria-label={l.menu.title} onClick={onClose}>
          <Link href={to("ats")} className={link}>{x.nav.atsCheck}</Link>
          <Link href={to("fit")} className={link}>{x.nav.fit}</Link>
          <Link href={to("compare")} className={link}>{r.compare.navLabel}</Link>
          {lang === "pt" && <Link href={to("calculator")} className={link}>{r.showcase.cards.calculator.t}</Link>}
          <Link href={to("tools")} className={link} data-testid="menu-tools">{r.showcase.hubTitle}</Link>
          <Link href={to("pricing")} className={link}>{x.nav.pricing}</Link>

          <p className="eyebrow pb-[var(--s-2)] pt-[var(--s-6)]">{l.menu.account}</p>
          <Link href="/library" className={link} data-testid="menu-library">{d.nav.myCVs}</Link>
          <Link href="/applications" className={link}>{x.nav.applications}</Link>
          <Link href="/interview" className={link}>{x.interview.sessionsTitle}</Link>
          {user && <Link href="/account" className={link} data-testid="menu-account">{l.menu.account}</Link>}
          {user?.role === "admin" && <Link href="/admin" className={link}>{l.menu.admin}</Link>}
          <Link href="/contact" className={link}>{l.footer.contact}</Link>
        </nav>

        <div className="mt-[var(--s-6)]"><LanguageSwitcher /></div>

        <div className="mt-auto border-t border-[var(--rule)] pt-[var(--s-5)]">
          {user ? (
            <Button variant="outline" className="w-full" onClick={() => { onClose(); void signOut(); }} data-testid="menu-signout">{x.nav.signOut}</Button>
          ) : (
            <div className="grid gap-[var(--s-3)]">
              <Button variant="outline" className="w-full" onClick={() => openAuth("in")} data-testid="menu-signin">{x.nav.signIn}</Button>
              <Button className="w-full" onClick={() => openAuth("up")}>{x.auth.signUp}</Button>
            </div>
          )}
          <p className="mt-[var(--s-5)] flex flex-wrap gap-x-[var(--s-5)] gap-y-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">
            <Link href="/legal/privacy" onClick={onClose} className="hover:text-[color:var(--ink)]">{l.footer.privacy}</Link>
            <Link href="/legal/terms" onClick={onClose} className="hover:text-[color:var(--ink)]">{l.footer.terms}</Link>
            <Link href="/legal/refunds" onClick={onClose} className="hover:text-[color:var(--ink)]">{l.footer.refunds}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
