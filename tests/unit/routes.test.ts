import { describe, expect, it } from "vitest";
import { ANGLE_KEYS, LP_SLUGS, ROUTES, ROUTE_LANGS, alternatesFor, angleFromSlug, href, langOfPath, routeKeyFor } from "@/lib/i18n/routes";
import { seoCopy } from "@/app/i18n/r3/seo";
import { lpCopy } from "@/app/i18n/r3/lp";
import { dictionaries } from "@/app/i18n/dictionaries";

/** Pages that deliberately exist in one language only. */
const SINGLE_LANGUAGE = new Set(["calculator", "lp:gupy"]);

describe("localized route table", () => {
  it("has every page in en, pt and es except the listed single-language ones", () => {
    for (const [key, paths] of Object.entries(ROUTES)) {
      if (SINGLE_LANGUAGE.has(key)) { expect(Object.keys(paths)).toEqual(["pt"]); continue; }
      for (const l of ROUTE_LANGS) expect(paths[l], `${key}.${l}`).toMatch(/^\//);
    }
  });

  it("never gives two pages the same URL", () => {
    const all = Object.values(ROUTES).flatMap((p) => Object.values(p));
    expect(new Set(all).size).toBe(all.length);
  });

  it("round-trips every URL through routeKeyFor", () => {
    for (const [key, paths] of Object.entries(ROUTES)) {
      for (const l of ROUTE_LANGS) {
        if (!paths[l]) continue;
        expect(routeKeyFor(paths[l]!)).toEqual({ key, lang: l });
        expect(href(key, l)).toBe(paths[l]);
      }
    }
    expect(routeKeyFor("/pt/precos/")).toEqual({ key: "pricing", lang: "pt" });
    expect(routeKeyFor("/library")).toBeNull();
  });

  it("serves localized URLs in their language and falls back to the only language a page has", () => {
    expect(langOfPath("/pt/lp/gupy")).toBe("pt");
    expect(langOfPath("/es")).toBe("es");
    expect(langOfPath("/ats-check/pt")).toBe("pt");
    expect(langOfPath("/pricing")).toBeNull();
    expect(langOfPath("/pto")).toBeNull();
    expect(href("calculator", "en")).toBe("/pt/calculadora-clt-pj");
  });

  it("builds hreflang alternates with x-default in English", () => {
    const alt = alternatesFor("pricing", "https://x.test");
    expect(alt).toEqual({ en: "https://x.test/pricing", "pt-BR": "https://x.test/pt/precos", es: "https://x.test/es/precios", "x-default": "https://x.test/pricing" });
    expect(alternatesFor("lp:gupy")["x-default"]).toBe("/pt/lp/gupy");
  });

  it("maps localized ad slugs back to their angle, and gupy only in Portuguese", () => {
    expect(angleFromSlug("pt", "primeiro-emprego")).toBe("firstjob");
    expect(angleFromSlug("es", "despido")).toBe("layoff");
    expect(angleFromSlug("en", "gupy")).toBeNull();
    expect(angleFromSlug("es", "gupy")).toBeNull();
    expect(angleFromSlug("pt", "nao-existe")).toBeNull();
  });

  it("has search copy and landing copy for every angle in every language it exists in", () => {
    for (const k of ANGLE_KEYS) {
      for (const l of ROUTE_LANGS) {
        if (!(LP_SLUGS[k] as Record<string, string>)[l]) continue;
        expect(seoCopy[l].lp[k]?.title, `${k}.${l}`).toBeTruthy();
        const copy = lpCopy[l].angles[k as "layoff"] ?? (dictionaries[l].lp.angles as Record<string, { title: string }>)[k];
        expect(copy?.title, `${k}.${l}`).toBeTruthy();
      }
    }
  });
});
