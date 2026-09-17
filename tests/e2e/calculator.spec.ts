import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

test.describe("CLT × PJ calculator", () => {
  test("server-rendered in Portuguese, listed in the sitemap, not linked from English pages", async ({ request }) => {
    const html = await (await request.get("/pt/calculadora-clt-pj")).text();
    expect(html).toMatch(/<html[^>]*lang="pt-BR"/);
    expect(html).toContain("CLT ou PJ? Faz a conta antes de responder a proposta");
    expect(html).toContain("não substitui um contador");
    expect(html).toContain("Lei nº 15.270/2025");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/pt/calculadora-clt-pj");
    for (const path of ["/", "/pricing", "/lp/jobseeker"]) expect(await (await request.get(path)).text(), path).not.toContain("calculadora-clt-pj");
    expect((await request.get("/es/calculadora-clt-pj")).status()).toBe(404);
  });

  test("both columns, a shareable URL, and an offer card that pre-fills it", async ({ page }) => {
    await page.goto("/pt/calculadora-clt-pj");
    await skipTour(page);
    await page.goto("/pt/calculadora-clt-pj");
    await page.getByTestId("calc-clt").fill("8000");
    await expect(page.getByTestId("calc-col-clt")).toContainText("Líquido por mês");
    await expect(page.getByTestId("calc-col-pj")).toContainText("Anexo");
    await expect(page.getByTestId("calc-equivalent")).toContainText("R$");
    await page.getByTestId("calc-pj").fill("12000");
    await page.getByTestId("calc-dep").fill("1");
    const url = page.url();
    expect(url).toContain("clt=8000");
    expect(url).toContain("pj=12000");
    const fresh = await page.context().newPage();
    await fresh.goto(url);
    await expect(fresh.getByTestId("calc-pj")).toHaveValue("12000");
    await expect(fresh.getByTestId("calc-dep")).toHaveValue("1");

    const res = await page.request.post("/api/applications", { data: { company: "Initech", role: "Dev", stage: "offer", offerType: "clt", offerAmount: 9500 } });
    expect(res.status()).toBe(200);
    await page.goto("/applications");
    await page.getByRole("button", { name: "PT" }).first().click();
    await page.getByTestId("app-card").filter({ hasText: "Initech" }).getByTestId("app-compare").click();
    await expect(page).toHaveURL(/\/pt\/calculadora-clt-pj\?clt=9500/);
    await expect(page.getByTestId("calc-clt")).toHaveValue("9500");
  });
});
