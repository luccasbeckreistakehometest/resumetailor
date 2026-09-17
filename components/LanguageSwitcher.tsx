"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Lang } from "@/app/i18n/dictionaries";
import { hasLang, href, routeKeyFor } from "@/lib/i18n/routes";
import { track } from "@/lib/client/track";

const LANGS: { code: Lang; short: string }[] = [{ code: "en", short: "EN" }, { code: "pt", short: "PT" }, { code: "es", short: "ES" }];

/**
 * On a localized public page the switcher goes to the same page in the other language (its own
 * URL). Elsewhere — app pages with one URL — it switches the language in place.
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const choose = (code: Lang) => {
    const match = routeKeyFor(pathname);
    if (code !== lang) track("lang_switch", { from: lang, to: code });
    setLang(code);
    if (match && match.lang !== code && hasLang(match.key, code)) router.push(href(match.key, code) as never);
  };
  return (
    <div className="flex items-center rounded-full border border-edge-2 bg-surface p-0.5" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => choose(l.code)} aria-pressed={lang === l.code} data-testid={`lang-${l.code}`}
          className={"rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide transition " + (lang === l.code ? "bg-ink text-paper" : "text-muted hover:text-ink")}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
