"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useDialog } from "./useDialog";
import { Portal } from "./Portal";
import { useI18n } from "@/app/i18n/I18nProvider";

export type AuthMode = "in" | "up";

/**
 * The header's account control. "Sign in" opens the sign-in form; signup CTAs elsewhere open the
 * signup form: `window.dispatchEvent(new CustomEvent("rt:auth", { detail: "up" }))`.
 */
export function AuthButton() {
  const { user, signOut } = useAuth();
  const { x, l } = useI18n();
  const [open, setOpen] = useState<AuthMode | null>(null);
  useEffect(() => {
    const h = (e: Event) => setOpen((e as CustomEvent<AuthMode | undefined>).detail === "up" ? "up" : "in");
    window.addEventListener("rt:auth", h);
    return () => window.removeEventListener("rt:auth", h);
  }, []);
  if (user) {
    return (
      <div className="hidden items-center gap-3 md:flex">
        <Link href="/account" className="text-sm font-medium text-ink-2 hover:text-ink" data-testid="nav-account">{user.name || user.email.split("@")[0]}</Link>
        <button onClick={signOut} className="text-sm font-medium text-muted hover:text-ink" data-testid="signout">{x.nav.signOut}</button>
        <span className="sr-only">{l.menu.signedInAs} {user.email}</span>
      </div>
    );
  }
  return (
    <>
      <button onClick={() => setOpen("in")} className="text-sm font-medium text-ink-2 hover:text-ink" data-testid="open-auth">{x.nav.signIn}</button>
      {open && <AuthModal initialMode={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function AuthModal(props: { onClose: () => void; onDone?: () => void; initialMode?: AuthMode }) {
  return <Portal><AuthDialog {...props} /></Portal>;
}

function AuthDialog({ onClose, onDone, initialMode = "in" }: { onClose: () => void; onDone?: () => void; initialMode?: AuthMode }) {
  const { login, register } = useAuth();
  const { x, l, lang } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [accept, setAccept] = useState(false); const [show, setShow] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useDialog<HTMLDivElement>(onClose);
  const id = useId();
  const up = mode === "up";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setNotice("");
    if (up && !accept) { setErr(l.apiErrors.terms_required); return; }
    setBusy(true);
    if (up) {
      const res = await register(email, password, name, lang, accept);
      setBusy(false);
      if (res.error) return setErr(res.error);
      if (res.bonus === false) {
        // Still signed in; say why the free credit is missing before moving on.
        setNotice(l.auth.noBonus);
        window.setTimeout(() => { onDone?.(); onClose(); }, 2500);
        return;
      }
    } else {
      const error = await login(email, password);
      setBusy(false);
      if (error) return setErr(error);
    }
    onDone?.(); onClose();
  }

  const switchMode = () => { setMode(up ? "in" : "up"); setErr(""); setForgot(false); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/60 p-4" onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-sub`} className="card relative my-auto w-full max-w-md p-7" onClick={(e) => e.stopPropagation()} data-testid="auth-modal" data-mode={mode}>
        <button type="button" onClick={onClose} aria-label={l.auth.close} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink" data-testid="auth-close">✕</button>
        <form onSubmit={submit} noValidate={false}>
          <p className="eyebrow">ResumeTailor</p>
          <h2 id={`${id}-title`} className="font-display mt-1 pr-8 text-2xl text-ink">{up ? l.auth.signUpTitle : l.auth.signInTitle}</h2>
          <p id={`${id}-sub`} className="mt-2 text-sm text-muted">{up ? l.auth.signUpSubtitle : l.auth.signInSubtitle}</p>
          <div className="mt-5 space-y-3">
            {up && (
              <div>
                <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-medium text-ink-2">{x.auth.name}</label>
                <input id={`${id}-name`} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
              </div>
            )}
            <div>
              <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-medium text-ink-2">{x.auth.email}</label>
              <input id={`${id}-email`} className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" data-autofocus />
            </div>
            <div>
              <label htmlFor={`${id}-password`} className="mb-1 block text-sm font-medium text-ink-2">{x.auth.password}</label>
              <div className="relative">
                <input id={`${id}-password`} className="field pr-20" type={show ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={up ? "new-password" : "current-password"} data-testid="auth-password" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted hover:text-ink" aria-pressed={show}>
                  {show ? l.auth.hidePassword : l.auth.showPassword}
                </button>
              </div>
            </div>
            {up && (
              <label className="flex items-start gap-2.5 text-sm text-ink-2" data-testid="auth-consent">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--oxblood)]" checked={accept} onChange={(e) => setAccept(e.target.checked)} aria-required="true" data-testid="auth-accept" />
                <span>
                  {l.auth.consentBefore} <Link href="/legal/terms" target="_blank" className="font-medium text-oxblood underline underline-offset-2">{l.auth.consentTerms}</Link>{" "}
                  {l.auth.consentAnd} <Link href="/legal/privacy" target="_blank" className="font-medium text-oxblood underline underline-offset-2">{l.auth.consentPrivacy}</Link>{l.auth.consentAfter}
                </span>
              </label>
            )}
            {err && <p className="text-sm text-oxblood" role="alert" data-testid="auth-error">{err}</p>}
            {notice && <p className="rounded-lg bg-gold-2 px-3 py-2 text-sm text-ink" role="status" data-testid="auth-notice">{notice}</p>}
            <button className="btn btn-primary w-full" disabled={busy || !!notice} data-testid="auth-submit">{busy ? x.auth.working : up ? x.auth.signUp : x.auth.signIn}</button>
          </div>
          {!up && (
            <div className="mt-3 text-center">
              <button type="button" onClick={() => setForgot(!forgot)} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline" aria-expanded={forgot} data-testid="auth-forgot">{l.auth.forgot}</button>
              {forgot && (
                <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-left text-sm text-ink-2">
                  {l.auth.forgotHelp} <Link href="/contact?topic=password" className="font-medium text-oxblood underline underline-offset-2" onClick={onClose}>{l.footer.contact} →</Link>
                </p>
              )}
            </div>
          )}
          <button type="button" onClick={switchMode} className="mt-4 w-full text-center text-sm text-ink-2 underline-offset-4 hover:underline" data-testid="auth-switch">
            {up ? x.auth.toSignIn : x.auth.toSignUp}
          </button>
        </form>
      </div>
    </div>
  );
}
