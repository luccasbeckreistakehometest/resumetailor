"use client";

import { useEffect } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Lang } from "@/app/i18n/dictionaries";

/** A localised route (/ats-check/pt) makes the whole UI follow the URL's language. */
export function LangSync({ lang }: { lang: Lang }) {
  const { lang: current, setLang } = useI18n();
  useEffect(() => {
    if (current === lang) return;
    const id = setTimeout(() => setLang(lang), 0);
    return () => clearTimeout(id);
  }, [current, lang, setLang]);
  return null;
}
