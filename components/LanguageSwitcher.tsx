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
    <div
      className="flex items-center rounded-[var(--r-pill)] border border-[var(--rule)] bg-[var(--sunken)] p-[2px]"
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => choose(l.code)}
          aria-pressed={lang === l.code}
          data-testid={`lang-${l.code}`}
          className={
            "rounded-[var(--r-pill)] px-[var(--s-3)] py-[3px] font-sans text-[length:var(--ui-11c)] font-bold uppercase tracking-[var(--ui-11c-ls)] transition-colors duration-[var(--dur-1)] " +
            (lang === l.code
              ? "bg-[var(--ink)] text-[color:var(--on-ink)]"
              : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]")
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
