import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

test.describe("legal pages, errors and share metadata", () => {
  test("privacy, terms, refunds and cookies exist in three languages and are linked from the footer", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    const footer = page.getByTestId("site-footer");
    for (const [name, href] of [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Refunds", "/legal/refunds"], ["Cookies", "/legal/cookies"], ["Contact", "/contact"]]) {
      await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    await footer.getByRole("link", { name: "Privacy", exact: true }).click();
    const doc = page.getByTestId("legal-doc");
    await expect(doc.locator("h1")).toHaveText("Privacy Policy");
    await expect(doc).toContainText("LGPD");
    await expect(doc).toContainText("Anthropic");
    await expect(doc).toContainText("Mercado Pago");
    await expect(doc).toContainText("Hostinger");
    // The seller is identified from the server's LEGAL_* values (fictional ones on the e2e server).
    const identity = page.getByTestId("legal-identity");
    await expect(identity).toContainText("Operador de Teste E2E");
    await expect(identity).toContainText("000.000.000-00");
    await expect(identity).toContainText("Rua de Teste, 1");
    await expect(identity.getByRole("link", { name: "legal@example.com" })).toHaveAttribute("href", "mailto:legal@example.com");
    await expect(identity).toContainText(/contact form/i);
    await expect(doc).toContainText("“Who runs ResumeTailor” box");

    await page.getByRole("button", { name: "PT" }).click();
    await expect(doc.locator("h1")).toHaveText("Política de Privacidade");
    await expect(doc).toContainText("art. 18 da LGPD");
    await page.getByRole("button", { name: "ES" }).click();
    await expect(doc.locator("h1")).toHaveText("Política de privacidad");

    await page.goto("/legal/refunds?lang=pt");
    await expect(doc.locator("h1")).toHaveText("Política de Reembolso");
    await expect(doc).toContainText("art. 49 do Código de Defesa do Consumidor");
    await page.goto("/legal/terms?lang=en");
    await expect(doc.locator("h1")).toHaveText("Terms of Use");
    await page.goto("/legal/cookies?lang=es");
    await expect(doc.locator("h1")).toHaveText("Aviso de cookies");
    await expect(doc).toContainText("rt_session");
  });

  test("the words people type redirect to the right page", async ({ page }) => {
    for (const [from, to] of [["/privacidade", "/legal/privacy"], ["/termos", "/legal/terms"], ["/terms", "/legal/terms"], ["/reembolso", "/legal/refunds"]]) {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}$`));
    }
  });

  test("unknown pages and unknown ad angles are branded 404s in the visitor's language", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await skipTour(page);
    await expect(page.getByTestId("not-found")).toHaveText("This page doesn't exist.");
    await page.getByRole("button", { name: "PT" }).click();
    await expect(page.getByTestId("not-found")).toHaveText("Essa página não existe.");
    await expect(page.getByRole("link", { name: "Fala com a gente" }).first()).toHaveAttribute("href", "/contact");
    expect((await page.goto("/lp/not-an-angle"))?.status()).toBe(404);
    expect((await page.goto("/legal/not-a-doc"))?.status()).toBe(404);
    expect((await page.goto("/lp/firstjob"))?.status()).toBe(200);
  });

  test("health, headers, metadata and icons", async ({ page, request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ ok: true, db: true });

    const home = await request.get("/");
    const h = home.headers();
    expect(h["x-powered-by"]).toBeUndefined();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["strict-transport-security"]).toContain("max-age");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3100");
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og).toMatch(/^http:\/\/localhost:3100\/opengraph-image/);
    const img = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toContain("image/png");
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon/);

    await page.goto("/pricing");
    await expect(page).toHaveTitle(/Pricing — prepaid credits, no subscription \| ResumeTailor/);
    await page.goto("/lp/careerchange");
    await expect(page).toHaveTitle(/Changing careers\?/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3100/lp/careerchange");
    await page.goto("/account");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
