"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";

export type User = { id: string; email: string; name: string; role: "user" | "admin"; credits: number; lang: string; createdAt: string; mustChangePassword?: boolean };
export type Payments = { stripe: boolean; mercadopago: boolean };
export type Support = { email: string | null; whatsapp: string | null };
export type Features = { insights: boolean; voice: boolean };
export type RegisterResult = { error: string | null; bonus?: boolean };

type Ctx = {
  user: User | null; loading: boolean; aiReady: boolean; payments: Payments; support: Support; features: Features;
  refresh: () => Promise<User | null>; signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string, lang: string, acceptTerms: boolean) => Promise<RegisterResult>;
};

const NO_PAYMENTS: Payments = { stripe: false, mercadopago: false };
const NO_SUPPORT: Support = { email: null, whatsapp: null };
const NO_FEATURES: Features = { insights: false, voice: false };

const AuthCtx = createContext<Ctx>({
  user: null, loading: true, aiReady: true, payments: NO_PAYMENTS, support: NO_SUPPORT, features: NO_FEATURES,
  refresh: async () => null, signOut: async () => {}, login: async () => null, register: async () => ({ error: null }),
});

/**
 * Session comes from the server cookie; the browser never holds a token it could leak. The same
 * call says what this server can do right now (AI up, which checkouts, which support channels).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { l, x } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Optimistic until the server answers, so the "AI down" banner never flashes on a healthy site.
  const [aiReady, setAiReady] = useState(true);
  const [payments, setPayments] = useState<Payments>(NO_PAYMENTS);
  const [support, setSupport] = useState<Support>(NO_SUPPORT);
  const [features, setFeatures] = useState<Features>(NO_FEATURES);

  const refresh = useCallback(async (): Promise<User | null> => {
    let next: User | null = null;
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      next = j.user ?? null;
      setUser(next); setAiReady(j.aiReady !== false);
      setPayments(j.payments ?? NO_PAYMENTS); setSupport(j.support ?? NO_SUPPORT); setFeatures(j.features ?? NO_FEATURES);
    } catch { setUser(null); }
    setLoading(false);
    return next;
  }, []);

  useEffect(() => { const id = setTimeout(() => void refresh(), 0); return () => clearTimeout(id); }, [refresh]);

  // Signed in with an admin-issued temporary password: the account page (where it is changed) comes
  // first. The server refuses the rest with password_change_required until then.
  const pathname = usePathname();
  const router = useRouter();
  const mustChange = !!user?.mustChangePassword;
  useEffect(() => {
    if (mustChange && !/^\/(account|legal|contact)(\/|$)/.test(pathname)) router.replace("/account");
  }, [mustChange, pathname, router]);

  const post = async (url: string, body: unknown): Promise<{ ok: boolean; j: Record<string, unknown> }> => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, j };
  };

  return (
    <AuthCtx.Provider value={{
      user, loading, aiReady, payments, support, features, refresh,
      signOut: async () => { await fetch("/api/auth/logout", { method: "POST" }); await refresh(); },
      login: async (email, password) => {
        const { ok, j } = await post("/api/auth/login", { email, password });
        if (!ok) return apiErrorText(j, l, x.errors.generic);
        await refresh();
        return null;
      },
      register: async (email, password, name, lang, acceptTerms) => {
        const { ok, j } = await post("/api/auth/register", { email, password, name, lang, acceptTerms });
        if (!ok) return { error: apiErrorText(j, l, x.errors.generic) };
        await refresh();
        return { error: null, bonus: j.bonus !== false };
      },
    }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
