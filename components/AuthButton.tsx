"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export function AuthButton({ dark = false }: { dark?: boolean }) {
  const { enabled, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  if (!enabled) return null;

  const linkCls = dark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-800";

  if (user) {
    return (
      <button onClick={signOut} className={"hidden text-sm font-medium sm:block " + linkCls}>
        {user.email?.split("@")[0]} · Sign out
      </button>
    );
  }

  async function magicLink() {
    setErr("");
    if (!supabase || !email.includes("@")) {
      setErr("Enter a valid email.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function google() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={"text-sm font-medium " + linkCls}>
        Sign in
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Sign in to ResumeTailor</h3>
            <p className="mt-1 text-sm text-slate-500">Save your CVs, credits and versions across devices.</p>
            {sent ? (
              <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">✅ Check your email for the magic link.</p>
            ) : (
              <div className="mt-5 space-y-3">
                <button onClick={google} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Continue with Google
                </button>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                {err && <p className="text-sm text-red-600">{err}</p>}
                <button onClick={magicLink} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Email me a magic link
                </button>
              </div>
            )}
            <button onClick={() => setOpen(false)} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
