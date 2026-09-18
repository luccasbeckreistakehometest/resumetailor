"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { seoCopy } from "@/app/i18n/r3/seo";
import { hasLang, href, routeKeyFor, type RouteLang } from "@/lib/i18n/routes";

const KEY = "rt_lang_pill_off";

/**
 * On an English public page, a visitor whose browser speaks Portuguese or Spanish is offered the
 * same page in that language. Never a forced redirect: search engines and people who chose
 * English keep the page they asked for.
 */
export function LangPill() {
  const { locked, lang } = useI18n();
  const pathname = usePathname();
  const [offer, setOffer] = useState<{ lang: RouteLang; url: string } | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const match = routeKeyFor(pathname);
      let off = false;
      try { off = localStorage.getItem(KEY) === "1" || !!localStorage.getItem("rt_lang"); } catch {}
      const nav = (navigator.language || "").toLowerCase();
      const want: RouteLang | null = nav.startsWith("pt") ? "pt" : nav.startsWith("es") ? "es" : null;
      // Never offer the language the page is already showing.
      if (locked || off || lang !== "en" || !match || match.lang !== "en" || !want || !hasLang(match.key, want)) return setOffer(null);
      setOffer({ lang: want, url: href(match.key, want) });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, locked, lang]);

  if (!offer) return null;
  const c = seoCopy[offer.lang];
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch {} setOffer(null); };
  return (
    <div className="fixed left-1/2 top-[70px] z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border border-edge-2 bg-raised py-1 pl-4 pr-1 text-sm shadow-[var(--shadow)]" data-testid="lang-pill">
      <Link href={offer.url} lang={offer.lang === "pt" ? "pt-BR" : "es"} className="font-medium text-[color:var(--ink)] decoration-[var(--rule-field)] underline-offset-4 hover:underline">{c.pill}</Link>
      <button type="button" onClick={dismiss} aria-label={c.pillClose} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink">✕</button>
    </div>
  );
}
