"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { Lang } from "@/app/i18n/dictionaries";

const LANGS: { code: Lang; short: string }[] = [
  { code: "en", short: "EN" },
  { code: "pt", short: "PT" },
  { code: "es", short: "ES" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center rounded-lg border border-slate-300 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={
            "rounded-md px-2 py-1 text-xs font-semibold transition " +
            (lang === l.code ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
