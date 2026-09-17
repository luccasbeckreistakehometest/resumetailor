"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dictionaries, Dict, Lang } from "./dictionaries";
import { extra, type Extra } from "./extra";
import { launch, type Launch } from "./launch";
import { round3, type Round3 } from "./round3";
import { hasLang, href, routeKeyFor, type RouteKey } from "@/lib/i18n/routes";

type Ctx = {
  lang: Lang; d: Dict; x: Extra; l: Launch; r: Round3; setLang: (l: Lang) => void;
  /** True on a page whose URL decides the language (/pt, /es…): the switcher navigates instead. */
  locked: boolean;
  /** The URL of a localized public page in the current language. */
  to: (key: RouteKey) => string;
  /** /start with an optional query; a localized page passes its language along. */
  startHref: (query?: string) => string;
};
const I18nContext = createContext<Ctx | null>(null);
const isLang = (v: unknown): v is Lang => v === "en" || v === "pt" || v === "es";

/**
 * `initialLang` is what the server renders. A locked provider (the /pt and /es pages) keeps it
 * and remembers it for the app pages; an unlocked one (everything else) starts in English and
 * then follows `?lang=`, the saved choice or the browser, after mount — except that an English
 * public page with its own Portuguese/Spanish version stays English for a visitor who has not
 * chosen yet (the LangPill offers that version instead of rewriting the page in place).
 */
export function I18nProvider({ children, initialLang = "en", locked = false }: { children: React.ReactNode; initialLang?: Lang; locked?: boolean }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const pathname = usePathname();

  useEffect(() => {
    if (locked) { try { localStorage.setItem("rt_lang", initialLang); } catch {} return; }
    // Detected inside a callback: the server render is English and the swap happens once the
    // browser can tell us its preference, which keeps hydration clean.
    const id = requestAnimationFrame(() => {
      const fromUrl = new URLSearchParams(window.location.search).get("lang");
      if (isLang(fromUrl)) { setLangState(fromUrl); try { localStorage.setItem("rt_lang", fromUrl); } catch {} return; }
      let saved: string | null = null;
      try { saved = localStorage.getItem("rt_lang"); } catch {}
      if (isLang(saved)) return setLangState(saved);
      const nav = (navigator.language || "").toLowerCase();
      const want: Lang = nav.startsWith("pt") ? "pt" : nav.startsWith("es") ? "es" : "en";
      const page = routeKeyFor(pathname ?? "");
      if (want !== "en" && page?.lang === "en" && hasLang(page.key, want)) return setLangState("en");
      setLangState(want);
    });
    return () => cancelAnimationFrame(id);
  }, [locked, initialLang, pathname]);

  useEffect(() => { document.documentElement.lang = lang === "pt" ? "pt-BR" : lang; }, [lang]);

  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem("rt_lang", l); } catch {} }, []);
  const to = useCallback((key: RouteKey) => href(key, lang), [lang]);
  const startHref = useCallback((query = "") => {
    const q = [locked ? `lang=${lang}` : "", query].filter(Boolean).join("&");
    return q ? `/start?${q}` : "/start";
  }, [locked, lang]);

  return <I18nContext.Provider value={{ lang, d: dictionaries[lang], x: extra[lang], l: launch[lang], r: round3[lang], setLang, locked, to, startHref }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
