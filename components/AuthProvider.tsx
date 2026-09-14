"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type User = { id: string; email: string; name: string; role: "user" | "admin"; credits: number; lang: string; createdAt: string };
type Ctx = {
  user: User | null; loading: boolean; aiReady: boolean; payments: { stripe: boolean; mercadopago: boolean };
  refresh: () => Promise<void>; signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string, lang: string) => Promise<string | null>;
};

const AuthCtx = createContext<Ctx>({
  user: null, loading: true, aiReady: false, payments: { stripe: false, mercadopago: false },
  refresh: async () => {}, signOut: async () => {}, login: async () => null, register: async () => null,
});

/** Session comes from the server cookie; the browser never holds a token it could leak. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiReady, setAiReady] = useState(false);
  const [payments, setPayments] = useState({ stripe: false, mercadopago: false });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setUser(j.user ?? null); setAiReady(!!j.aiReady); setPayments(j.payments ?? { stripe: false, mercadopago: false });
    } catch { setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { const id = setTimeout(() => void refresh(), 0); return () => clearTimeout(id); }, [refresh]);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return (j.error as string) || "Something went wrong.";
    await refresh();
    return null;
  };

  return (
    <AuthCtx.Provider value={{
      user, loading, aiReady, payments, refresh,
      signOut: async () => { await fetch("/api/auth/logout", { method: "POST" }); await refresh(); },
      login: (email, password) => post("/api/auth/login", { email, password }),
      register: (email, password, name, lang) => post("/api/auth/register", { email, password, name, lang }),
    }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
