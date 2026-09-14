"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { Lang } from "@/app/i18n/dictionaries";

const LANGS: { code: Lang; short: string }[] = [{ code: "en", short: "EN" }, { code: "pt", short: "PT" }, { code: "es", short: "ES" }];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center rounded-full border border-edge-2 bg-surface p-0.5" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={lang === l.code}
          className={"rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide transition " + (lang === l.code ? "bg-ink text-paper" : "text-muted hover:text-ink")}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
