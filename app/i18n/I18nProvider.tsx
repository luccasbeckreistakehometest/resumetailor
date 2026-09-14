"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, Dict, Lang } from "./dictionaries";

type Ctx = { lang: Lang; d: Dict; setLang: (l: Lang) => void };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("rt_lang") as Lang | null;
    if (saved && dictionaries[saved]) {
      setLangState(saved);
      return;
    }
    // Region default from the browser locale (a good proxy until IP-geo is added).
    const nav = (navigator.language || "").toLowerCase();
    const detected: Lang = nav.startsWith("pt") ? "pt" : nav.startsWith("es") ? "es" : "en";
    setLangState(detected);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("rt_lang", l);
    } catch {}
  };

  return (
    <I18nContext.Provider value={{ lang, d: dictionaries[lang], setLang }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
