"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useI18n } from "@/app/i18n/I18nProvider";

/** Opens the sign-in modal from anywhere: `window.dispatchEvent(new Event("rt:auth"))`. */
export function AuthButton() {
  const { user, signOut } = useAuth();
  const { x } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("rt:auth", h);
    return () => window.removeEventListener("rt:auth", h);
  }, []);
  if (user) {
    return (
      <button onClick={signOut} className="hidden text-sm font-medium text-ink-2 hover:text-ink sm:block" data-testid="signout">
        {user.name || user.email.split("@")[0]} · {x.nav.signOut}
      </button>
    );
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm font-medium text-ink-2 hover:text-ink" data-testid="open-auth">{x.nav.signIn}</button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function AuthModal({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const { login, register } = useAuth();
  const { x, lang } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const error = mode === "in" ? await login(email, password) : await register(email, password, name, lang);
    setBusy(false);
    if (error) return setErr(error);
    onDone?.(); onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card w-full max-w-md p-7" onClick={(e) => e.stopPropagation()} data-testid="auth-modal">
        <p className="eyebrow">ResumeTailor</p>
        <h3 className="font-display mt-1 text-2xl text-ink">{x.auth.title}</h3>
        <p className="mt-2 text-sm text-muted">{x.auth.subtitle}</p>
        <div className="mt-5 space-y-3">
          {mode === "up" && <input className="field" placeholder={x.auth.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          <input className="field" type="email" required placeholder={x.auth.email} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="auth-email" />
          <input className="field" type="password" required minLength={8} placeholder={x.auth.password} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} data-testid="auth-password" />
          {err && <p className="text-sm text-oxblood" role="alert">{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy} data-testid="auth-submit">{busy ? x.auth.working : mode === "in" ? x.auth.signIn : x.auth.signUp}</button>
        </div>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }} className="mt-4 w-full text-center text-sm text-ink-2 underline-offset-4 hover:underline">
          {mode === "in" ? x.auth.toSignUp : x.auth.toSignIn}
        </button>
      </form>
    </div>
  );
}
