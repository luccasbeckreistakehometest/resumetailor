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

describe("showcase copy parity", () => {
  it("every feature card and angle exists in every language, with 6+ features per angle", async () => {
    const { showcaseCopy } = await import("@/app/i18n/r3/showcase");
    const { ANGLE_CONTENT, angleFaq } = await import("@/app/i18n/r3/angles");
    const keys = Object.keys(showcaseCopy.en.cards).sort();
    for (const l of ["pt", "es"] as const) {
      expect(Object.keys(showcaseCopy[l].cards).sort()).toEqual(keys);
      for (const k of keys) expect(showcaseCopy[l].cards[k as "truth"].t.length, `${l}.${k}`).toBeGreaterThan(3);
      expect(showcaseCopy[l].checklist({ deepen: 2, interviews: 5, quantify: 1, intl: 2, pitch: 5 })).toHaveLength(showcaseCopy.en.checklist({ deepen: 2, interviews: 5, quantify: 1, intl: 2, pitch: 5 }).length);
    }
    for (const [angle, c] of Object.entries(ANGLE_CONTENT)) {
      expect(c.features.length, angle).toBeGreaterThanOrEqual(6);
      for (const f of c.features) expect(keys).toContain(f);
    }
    for (const l of ["en", "pt", "es"] as const) expect(angleFaq[l].base).toHaveLength(3);
    expect(angleFaq.pt.specific.gupy?.a).toContain("sem afiliação");
  });

  it("no feature ships without being sold on an ad landing and on the hub", async () => {
    const { showcaseCopy } = await import("@/app/i18n/r3/showcase");
    const { ANGLE_CONTENT } = await import("@/app/i18n/r3/angles");
    const { HUB_FEATURES } = await import("@/components/ToolsHub");
    const keys = Object.keys(showcaseCopy.en.cards) as (keyof typeof showcaseCopy.en.cards)[];
    // The hub's headline is "everything you can do", in all three languages: it must mean it.
    expect([...HUB_FEATURES].sort()).toEqual([...keys].sort());
    // An angle may leave a feature out on purpose; a feature on NO angle is an oversight, not an
    // editorial choice — paid traffic never hears about it. `intl` was in that hole.
    const onSomeAngle = new Set(Object.values(ANGLE_CONTENT).flatMap((c) => c.features));
    expect([...keys].filter((k) => !onSomeAngle.has(k))).toEqual([]);
  });
});
