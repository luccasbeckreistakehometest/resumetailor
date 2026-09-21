"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useDialog } from "./useDialog";
import { Portal } from "./Portal";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Button, Checkbox, Field, Icon, Input, Notice } from "@/components/ui";

export type AuthMode = "in" | "up";

/**
 * The header's signed-out control. Signed in, the header shows the account menu instead, so this
 * renders only for a visitor. "Sign in" opens the sign-in form; signup CTAs elsewhere open the
 * signup form: `window.dispatchEvent(new CustomEvent("rt:auth", { detail: "up" }))`.
 */
export function AuthButton() {
  const { x } = useI18n();
  const [open, setOpen] = useState<AuthMode | null>(null);
  useEffect(() => {
    const h = (e: Event) => setOpen((e as CustomEvent<AuthMode | undefined>).detail === "up" ? "up" : "in");
    window.addEventListener("rt:auth", h);
    return () => window.removeEventListener("rt:auth", h);
  }, []);
  return (
    <>
      <Button variant="quiet" size="sm" onClick={() => setOpen("in")} data-testid="open-auth">{x.nav.signIn}</Button>
      {open && <AuthModal initialMode={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function AuthModal(props: { onClose: () => void; onDone?: () => void; initialMode?: AuthMode }) {
  return <Portal><AuthDialog {...props} /></Portal>;
}

/**
 * The account dialog (surface 6). One column at the measure, the label above every field, the
 * consent tick as a real control rather than a native box, and the error as a mark-toned notice —
 * red here means "this needs your attention", which is exactly what the system reserves it for.
 */
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
  const inkLink = "font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--ink)_58%,transparent)] p-[var(--s-5)]" onClick={onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-sub`}
        className="relative my-auto w-full max-w-[420px] rounded-[var(--r-3)] border border-[var(--rule)] bg-[var(--raised)]"
        style={{ boxShadow: "var(--shadow-pop)" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="auth-modal"
        data-mode={mode}
      >
        <div className="flex items-start justify-between gap-[var(--s-5)] border-b border-[var(--rule-hairline)] px-[var(--s-7)] py-[var(--s-6)]">
          <div className="min-w-0">
            <p className="eyebrow">ResumeTailor</p>
            <h2 id={`${id}-title`} className="doc-26 mt-[var(--s-2)] text-[color:var(--ink)]">{up ? l.auth.signUpTitle : l.auth.signInTitle}</h2>
            <p id={`${id}-sub`} className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">
              {up ? l.auth.signUpSubtitle : l.auth.signInSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={l.auth.close}
            className="-mr-[var(--s-2)] -mt-[var(--s-2)] grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-1)] text-[color:var(--ink-muted)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]"
            data-testid="auth-close"
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit} className="px-[var(--s-7)] py-[var(--s-6)]">
          <div className="flex flex-col gap-[var(--s-5)]">
            {up && (
              <Field label={x.auth.name}>
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />}
              </Field>
            )}
            <Field label={x.auth.email}>
              {(p) => <Input {...p} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" data-autofocus />}
            </Field>
            <Field label={x.auth.password}>
              {(p) => (
                <div className="relative">
                  <Input
                    {...p}
                    className="pr-[84px]"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={up ? "new-password" : "current-password"}
                    data-testid="auth-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-[var(--s-2)] top-1/2 -translate-y-1/2 rounded-[var(--r-1)] px-[var(--s-3)] py-[var(--s-2)] font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                    aria-pressed={show}
                  >
                    {show ? l.auth.hidePassword : l.auth.showPassword}
                  </button>
                </div>
              )}
            </Field>

            {up && (
              <div data-testid="auth-consent">
                <Checkbox
                  checked={accept}
                  onChange={(e) => setAccept(e.target.checked)}
                  aria-required="true"
                  data-testid="auth-accept"
                  className="text-[color:var(--ink-2)]"
                  label={
                    <>
                      {l.auth.consentBefore} <Link href="/legal/terms" target="_blank" className={inkLink}>{l.auth.consentTerms}</Link>{" "}
                      {l.auth.consentAnd} <Link href="/legal/privacy" target="_blank" className={inkLink}>{l.auth.consentPrivacy}</Link>{l.auth.consentAfter}
                    </>
                  }
                />
              </div>
            )}

            {err && <Notice tone="mark" icon="flag"><span data-testid="auth-error">{err}</span></Notice>}
            {notice && <Notice tone="query"><span data-testid="auth-notice">{notice}</span></Notice>}

            <Button type="submit" className="w-full" loading={busy} disabled={!!notice} data-testid="auth-submit">
              {busy ? x.auth.working : up ? x.auth.signUp : x.auth.signIn}
            </Button>
          </div>

          {!up && (
            <div className="mt-[var(--s-5)] text-center">
              <button type="button" onClick={() => setForgot(!forgot)} className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)] underline-offset-4 hover:text-[color:var(--ink)] hover:underline" aria-expanded={forgot} data-testid="auth-forgot">
                {l.auth.forgot}
              </button>
              {forgot && (
                <p className="mt-[var(--s-4)] rounded-[var(--r-1)] bg-[var(--sunken)] px-[var(--s-5)] py-[var(--s-4)] text-left font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">
                  {l.auth.forgotHelp} <Link href="/contact?topic=password" className={inkLink} onClick={onClose}>{l.footer.contact} →</Link>
                </p>
              )}
            </div>
          )}

          <hr className="my-[var(--s-5)] h-px border-0 bg-[var(--rule-hairline)]" />
          <button type="button" onClick={switchMode} className="w-full text-center font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)] underline-offset-4 hover:underline" data-testid="auth-switch">
            {up ? x.auth.toSignIn : x.auth.toSignUp}
          </button>
        </form>
      </div>
    </div>
  );
}
