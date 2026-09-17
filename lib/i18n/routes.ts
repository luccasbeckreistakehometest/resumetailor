/**
 * The localized public pages: one table feeds links, the language switcher, hreflang and the
 * sitemap. App pages behind a session (/start, /library…) keep a single URL and follow the
 * visitor's language instead. A route with no `en`/`es` entry exists in that language only.
 */
export type RouteLang = "en" | "pt" | "es";
export const ROUTE_LANGS: RouteLang[] = ["en", "pt", "es"];
export type Paths = Partial<Record<RouteLang, string>>;

/** Ad-landing angles and their slug in each language. `gupy` is Brazil-only on purpose. */
export const LP_SLUGS = {
  jobseeker: { en: "jobseeker", pt: "procurando-emprego", es: "busco-empleo" },
  firstjob: { en: "firstjob", pt: "primeiro-emprego", es: "primer-empleo" },
  careerchange: { en: "careerchange", pt: "mudanca-de-carreira", es: "cambio-de-carrera" },
  vschatgpt: { en: "vschatgpt", pt: "vs-chatgpt", es: "vs-chatgpt" },
  layoff: { en: "layoff", pt: "recolocacao", es: "despido" },
  interview: { en: "interview", pt: "entrevista", es: "entrevista" },
  gupy: { pt: "gupy" },
} as const satisfies Record<string, Paths>;
export type AngleKey = keyof typeof LP_SLUGS;
export const ANGLE_KEYS = Object.keys(LP_SLUGS) as AngleKey[];

const lpPaths = (key: AngleKey): Paths => {
  const slugs: Paths = LP_SLUGS[key];
  const out: Paths = {};
  if (slugs.en) out.en = `/lp/${slugs.en}`;
  if (slugs.pt) out.pt = `/pt/lp/${slugs.pt}`;
  if (slugs.es) out.es = `/es/lp/${slugs.es}`;
  return out;
};

export const ROUTES = {
  home: { en: "/", pt: "/pt", es: "/es" },
  pricing: { en: "/pricing", pt: "/pt/precos", es: "/es/precios" },
  fit: { en: "/fit", pt: "/pt/sou-um-fit", es: "/es/encajo" },
  // The ATS check was localized first; its URLs stay as they are (already shared and indexed).
  ats: { en: "/ats-check", pt: "/ats-check/pt", es: "/ats-check/es" },
  tools: { en: "/tools", pt: "/pt/recursos", es: "/es/recursos" },
  compare: { en: "/compare", pt: "/pt/comparar-vagas", es: "/es/comparar-ofertas" },
  // Brazilian payroll math: Portuguese only.
  calculator: { pt: "/pt/calculadora-clt-pj" },
  ...Object.fromEntries(ANGLE_KEYS.map((k) => [`lp:${k}`, lpPaths(k)])),
} as Readonly<Record<string, Paths>>;

export type RouteKey = string;

/** The URL of a page in a language; falls back to English, then to the first language it exists in. */
export function href(key: RouteKey, lang: RouteLang): string {
  const p = ROUTES[key];
  if (!p) throw new Error(`unknown route ${key}`);
  return p[lang] ?? p.en ?? Object.values(p)[0]!;
}

/** Does this page exist in that language (no fallback)? */
export const hasLang = (key: RouteKey, lang: RouteLang) => !!ROUTES[key]?.[lang];

const HREFLANG: Record<RouteLang, string> = { en: "en", pt: "pt-BR", es: "es" };
export const htmlLang = (lang: RouteLang) => HREFLANG[lang];
export const ogLocale = (lang: RouteLang) => ({ en: "en_US", pt: "pt_BR", es: "es_ES" })[lang];

/** hreflang alternates (absolute when `base` is given) plus x-default = English when it exists. */
export function alternatesFor(key: RouteKey, base = ""): Record<string, string> {
  const p = ROUTES[key] ?? {};
  const out: Record<string, string> = {};
  for (const l of ROUTE_LANGS) if (p[l]) out[HREFLANG[l]] = `${base}${p[l]}`;
  out["x-default"] = `${base}${p.en ?? Object.values(p)[0]}`;
  return out;
}

/** Which table entry a pathname is, and in which language. Null for app pages. */
export function routeKeyFor(pathname: string): { key: RouteKey; lang: RouteLang } | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const [key, paths] of Object.entries(ROUTES)) {
    for (const l of ROUTE_LANGS) if (paths[l] === clean) return { key, lang: l };
  }
  return null;
}

/** Every localized URL, for the sitemap. */
export function allRoutes(): { key: RouteKey; paths: Paths }[] {
  return Object.entries(ROUTES).map(([key, paths]) => ({ key, paths }));
}

/** The language a pathname is served in when the URL decides it (/pt…, /es…, /ats-check/pt). */
export function langOfPath(pathname: string): RouteLang | null {
  if (/^\/pt(\/|$)/.test(pathname) || pathname === "/ats-check/pt") return "pt";
  if (/^\/es(\/|$)/.test(pathname) || pathname === "/ats-check/es") return "es";
  return null;
}

/** An angle from a localized slug (/pt/lp/<slug>). */
export function angleFromSlug(lang: RouteLang, slug: string): AngleKey | null {
  for (const k of ANGLE_KEYS) if ((LP_SLUGS[k] as Paths)[lang] === slug) return k;
  return null;
}
export const angleSlugs = (lang: RouteLang): string[] =>
  ANGLE_KEYS.map((k) => (LP_SLUGS[k] as Paths)[lang]).filter((s): s is string => !!s);
