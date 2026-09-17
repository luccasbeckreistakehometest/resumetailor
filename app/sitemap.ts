import type { MetadataRoute } from "next";
import { LEGAL_DOCS } from "./(site)/legal/docs";
import { alternatesFor, allRoutes, ROUTE_LANGS } from "@/lib/i18n/routes";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PRIORITY: Record<string, number> = { home: 1, ats: 0.9, fit: 0.8, compare: 0.8, calculator: 0.8, pricing: 0.7, tools: 0.7 };

/**
 * Public, indexable pages only. Every localized page is listed in each language it exists in,
 * with its hreflang alternates. Everything behind a session or a cookie is left out on purpose.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const localized = allRoutes().flatMap(({ key, paths }) => {
    const languages = alternatesFor(key, BASE);
    delete languages["x-default"];
    return ROUTE_LANGS.filter((l) => paths[l]).map((l) => ({
      url: `${BASE}${paths[l] === "/" ? "/" : paths[l]}`, lastModified,
      changeFrequency: "monthly" as const, priority: PRIORITY[key] ?? 0.6,
      alternates: { languages },
    }));
  });
  return [
    ...localized,
    { url: `${BASE}/start`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/contact`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...Object.keys(LEGAL_DOCS).map((doc) => ({ url: `${BASE}/legal/${doc}`, lastModified, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
