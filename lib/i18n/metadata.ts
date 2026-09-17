import type { Metadata } from "next";
import { seoCopy } from "@/app/i18n/r3/seo";
import { alternatesFor, href, ogLocale, type RouteKey, type RouteLang } from "@/lib/i18n/routes";

export const SITE = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
/** The default share card (app/opengraph-image.tsx). Listed explicitly: with three root layouts the file is not injected by itself. */
export const OG_IMAGES = [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ResumeTailor" }];
const abs = (path: string) => (path === "/" ? SITE : `${SITE}${path}`);

/** Root-layout defaults for one language. */
export function siteMetadata(lang: RouteLang): Metadata {
  const s = seoCopy[lang].site;
  return {
    // Absolute URLs for Open Graph images and canonicals (shared /cv links used to point at localhost).
    metadataBase: new URL(SITE),
    title: { default: s.title, template: "%s | ResumeTailor" },
    description: s.description,
    applicationName: "ResumeTailor",
    openGraph: { type: "website", siteName: "ResumeTailor", title: s.title, description: s.description, url: "/", locale: ogLocale(lang), images: OG_IMAGES },
    twitter: { card: "summary_large_image", title: s.title, description: s.description, images: ["/opengraph-image"] },
  };
}

/** A localized page: its own title/description, canonical and hreflang for every language it exists in. */
export function pageMetadata(key: RouteKey, lang: RouteLang, meta: { title: string; description: string }): Metadata {
  const url = abs(href(key, lang));
  const languages = Object.fromEntries(Object.entries(alternatesFor(key)).map(([k, v]) => [k, abs(v)]));
  return {
    title: { absolute: /ResumeTailor/.test(meta.title) ? meta.title : `${meta.title} | ResumeTailor` },
    description: meta.description,
    alternates: { canonical: url, languages },
    openGraph: { siteName: "ResumeTailor", title: meta.title, description: meta.description, url, type: "website", locale: ogLocale(lang), images: OG_IMAGES },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: ["/opengraph-image"] },
  };
}
