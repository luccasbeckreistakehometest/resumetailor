import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

/** Raw server HTML (no JavaScript): what a crawler and a slow phone see first. */
async function html(request: import("@playwright/test").APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);
  return res.text();
}
const h1 = (page: string) => (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "");

test.describe("localized public pages", () => {
  test("Portuguese and Spanish pages are rendered in their language on the server, with hreflang", async ({ request }) => {
    const pt = await html(request, "/pt");
    expect(pt).toMatch(/<html[^>]*lang="pt-BR"/);
    expect(pt).toMatch(/<title>ResumeTailor — O ChatGPT te dá texto/);
    expect(h1(pt)).toContain("Passe pelos filtros");
    for (const lang of ["en", "pt-BR", "es", "x-default"]) expect(pt).toMatch(new RegExp(`rel="alternate" hrefLang="${lang}"`, "i"));

    const es = await html(request, "/es");
    expect(es).toMatch(/<html[^>]*lang="es"/);
    expect(h1(es)).toContain("Supera los filtros");

    const precos = await html(request, "/pt/precos");
    expect(precos).toMatch(/lang="pt-BR"/);
    expect(precos).toContain("R$ 39");
    expect(precos).toMatch(/<title>Preços — créditos pré-pagos/);
    expect(await html(request, "/es/precios")).toMatch(/<title>Precios — créditos prepagos/);
    expect(await html(request, "/pt/sou-um-fit")).toMatch(/<title>Sou um fit pra essa vaga\?/);
    expect(await html(request, "/es/encajo")).toMatch(/lang="es"/);
    expect(await html(request, "/ats-check/pt")).toMatch(/<html[^>]*lang="pt-BR"/);
    expect(await html(request, "/")).toMatch(/<html[^>]*lang="en"/);
  });

  test("every localized ad landing renders; unknown slugs and pt-only angles elsewhere are 404", async ({ request }) => {
    const pages: [string, string][] = [
      ["/pt/lp/procurando-emprego", "pt-BR"], ["/pt/lp/primeiro-emprego", "pt-BR"], ["/pt/lp/mudanca-de-carreira", "pt-BR"], ["/pt/lp/vs-chatgpt", "pt-BR"],
      ["/pt/lp/recolocacao", "pt-BR"], ["/pt/lp/entrevista", "pt-BR"], ["/pt/lp/gupy", "pt-BR"],
      ["/es/lp/busco-empleo", "es"], ["/es/lp/primer-empleo", "es"], ["/es/lp/cambio-de-carrera", "es"], ["/es/lp/vs-chatgpt", "es"],
      ["/es/lp/despido", "es"], ["/es/lp/entrevista", "es"], ["/lp/layoff", "en"], ["/lp/interview", "en"],
    ];
    for (const [path, lang] of pages) {
      const page = await html(request, path);
      expect(page, path).toMatch(new RegExp(`<html[^>]*lang="${lang}"`));
      expect(h1(page).trim().length, path).toBeGreaterThan(10);
    }
    for (const path of ["/pt/lp/nao-existe", "/pt/qualquer", "/lp/gupy", "/es/lp/gupy", "/lp/xyz", "/es/nada"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("the sitemap lists every language of every localized page", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/pt", "/es", "/pt/precos", "/es/precios", "/pt/sou-um-fit", "/es/encajo", "/pt/lp/gupy", "/es/lp/despido", "/lp/interview", "/ats-check/pt"]) {
      expect(xml, path).toContain(`<loc>http://localhost:3100${path}</loc>`);
    }
    expect(xml).toContain('hreflang="pt-BR"');
  });

  test("the switcher moves between equivalent pages and the CTA opens the app in that language", async ({ page }) => {
    await page.goto("/pt");
    await skipTour(page);
    await page.goto("/pt");
    await page.getByRole("button", { name: "ES" }).first().click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await page.getByRole("button", { name: "PT" }).first().click();
    await expect(page).toHaveURL(/\/pt$/);
    await page.getByTestId("hero-start").click();
    await expect(page).toHaveURL(/\/start\?lang=pt/);
    await expect(page.locator("h1")).toContainText("Como você prefere");
  });

  test.describe("browser in Portuguese", () => {
    test.use({ locale: "pt-BR" });
    test("the English home offers the Portuguese page without redirecting", async ({ page }) => {
      await page.goto("/");
      await skipTour(page);
      await expect(page).toHaveURL(/\/$/);
      const pill = page.getByTestId("lang-pill");
      await expect(pill).toContainText("Ver esta página em português");
      // The English page stays English (no in-place rewrite under the pill offering Portuguese).
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1").first()).not.toContainText("Passe pelos filtros");
      await pill.getByRole("link").click();
      await expect(page).toHaveURL(/\/pt$/);
      await expect(page.getByTestId("lang-pill")).toHaveCount(0);
    });
    test("an app page without its own Portuguese URL still follows the browser", async ({ page }) => {
      await page.goto("/legal/privacy");
      await expect(page.getByTestId("legal-doc").locator("h1")).toHaveText("Política de Privacidade");
      await expect(page.getByTestId("lang-pill")).toHaveCount(0);
    });
  });
});
