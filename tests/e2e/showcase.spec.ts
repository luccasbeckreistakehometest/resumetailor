import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

const LPS = [
  "/lp/jobseeker", "/lp/firstjob", "/lp/careerchange", "/lp/vschatgpt", "/lp/layoff", "/lp/interview",
  "/pt/lp/procurando-emprego", "/pt/lp/primeiro-emprego", "/pt/lp/mudanca-de-carreira", "/pt/lp/vs-chatgpt", "/pt/lp/recolocacao", "/pt/lp/entrevista", "/pt/lp/gupy",
  "/es/lp/busco-empleo", "/es/lp/primer-empleo", "/es/lp/cambio-de-carrera", "/es/lp/vs-chatgpt", "/es/lp/despido", "/es/lp/entrevista",
];

test.describe("landing pages, hub and pricing show everything", () => {
  test("every ad landing has at least 6 feature cards, the free strip, the price and a FAQ in its server HTML", async ({ request }) => {
    for (const path of LPS) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect((html.match(/data-testid="showcase-card"/g) ?? []).length, path).toBeGreaterThanOrEqual(6);
      for (const id of ["lp-free", "lp-price", "lp-faq", "lp-cta"]) expect(html, `${path} ${id}`).toContain(`data-testid="${id}"`);
    }
    const gupy = await (await request.get("/pt/lp/gupy")).text();
    expect(gupy).toContain("sem afiliação");
    expect(gupy).toContain("R$ 39");
    for (const path of ["/lp/gupy", "/es/lp/gupy", "/lp/xyz"]) expect((await request.get(path)).status(), path).toBe(404);
  });

  test("the tools hub lists at least 12 tools and every link opens", async ({ page, request }) => {
    for (const hub of ["/tools", "/pt/recursos", "/es/recursos"]) {
      await page.goto(hub);
      await skipTour(page);
      await page.goto(hub);
      const links = page.getByTestId("showcase-link");
      expect(await links.count(), hub).toBeGreaterThanOrEqual(12);
      const hrefs = [...new Set(await links.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? "")))];
      for (const href of hrefs) {
        const res = await request.get(href.split("#")[0]);
        expect(res.status(), `${hub} → ${href}`).toBe(200);
      }
    }
    const pt = await (await request.get("/pt/recursos")).text();
    expect(pt).toContain("calculadora-clt-pj");
    expect(await (await request.get("/tools")).text()).not.toContain("calculadora-clt-pj");
  });

  test("pricing states what one credit unlocks, with the per-kit caps; home links the hub", async ({ page }) => {
    await page.goto("/pricing");
    await skipTour(page);
    await page.goto("/pricing");
    const list = page.getByTestId("pricing-checklist");
    await expect(list).toContainText("One credit unlocks all of this");
    await expect(list).toContainText("Up to 5 mock interviews");
    await expect(list).toContainText("2 “go deeper” passes");
    await expect(list).toContainText("1 “missing numbers” round");
    await expect(list).toContainText("1 international version");   // KIT_INTL_MAX=1 on the test server: the page follows the server
    await expect(list).toContainText("No subscription. No trial that turns into a charge.");
    await page.goto("/pt/precos");
    await expect(page.getByTestId("pricing-checklist")).toContainText("Um crédito libera tudo isto");
    // The English home (server HTML) has 8 cards; the CLT × PJ card is Brazil-only.
    const home = await (await page.request.get("/")).text();
    expect((home.match(/data-testid="showcase-card"/g) ?? []).length).toBe(8);
    await page.goto("/");
    // Having visited /pt/precos, the app now follows Portuguese: the hub link goes to /pt/recursos.
    await page.getByTestId("home-hub").click();
    await expect(page).toHaveURL(/\/(tools|pt\/recursos)$/);
  });
});
