import { angleFromSlug, angleSlugs, type AngleKey, type RouteLang } from "@/lib/i18n/routes";

export type { AngleKey };
/** English ad angles (URL slugs). The localized ones live under /pt/lp and /es/lp. */
export const ANGLES = angleSlugs("en");
export const angleOf = (lang: RouteLang, slug: string) => angleFromSlug(lang, slug);
