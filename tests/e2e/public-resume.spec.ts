import { type Browser } from "@playwright/test";
import { test, expect } from "./fixtures";
import { buildKitByText, signUp } from "./helpers";

/** A visitor with no cookies at all: what a recruiter who got the link on WhatsApp sees. */
async function visitor(browser: Browser, url: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.goto(url);
  return { ctx, page, status: res?.status() ?? 0 };
}

test.describe("public web résumé", () => {
  test("publish → visitors see it → hide contact → PIN gate → views counted → library lists it → off means 404", async ({ page, browser, request }) => {
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("publish")).toHaveAttribute("data-enabled", "0");
    await page.getByTestId("publish-toggle").check();
    await expect(page.getByTestId("publish")).toHaveAttribute("data-enabled", "1");
    await expect(page.getByTestId("publish-url")).toHaveValue(/\/cv\/alex-ribeiro-[0-9a-f]{6}$/);
    const url = await page.getByTestId("publish-url").inputValue();
    await expect(page.getByTestId("publish-whatsapp")).toHaveAttribute("href", /wa\.me/);
    await expect(page.getByTestId("publish-linkedin")).toHaveAttribute("href", /linkedin\.com\/sharing/);

    // A stranger opens it: the résumé, the contact line, noindex by default, no tour, no support bubble.
    const v1 = await visitor(browser, url);
    expect(v1.status).toBe(200);
    await expect(v1.page.getByTestId("cv-document")).toContainText("Alex Ribeiro");
    await expect(v1.page.getByTestId("cv-document")).toContainText("alex@example.com");
    await expect(v1.page.getByTestId("cv-document")).toHaveAttribute("data-template", "modern");
    await expect(v1.page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(v1.page.getByTestId("cv-owner")).toBeHidden();
    await v1.page.waitForTimeout(600);
    await expect(v1.page.getByTestId("tour-welcome")).toBeHidden();
    await expect(v1.page.getByTestId("cv-copy")).toBeVisible();
    // The unfurl card renders as an image (its URL carries a build hash; read it from the page).
    const ogUrl = new URL((await v1.page.locator('meta[property="og:image"]').first().getAttribute("content"))!);
    await v1.ctx.close();
    const og = await request.get(ogUrl.pathname + ogUrl.search);
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");

    // Owner options: template, contact hidden, indexable.
    await page.getByTestId("publish-template-elegant").click();
    await page.getByTestId("publish-hide").check();
    await page.getByTestId("publish-index").check();
    const v2 = await visitor(browser, url);
    await expect(v2.page.getByTestId("cv-document")).toHaveAttribute("data-template", "elegant");
    await expect(v2.page.getByTestId("cv-document")).toContainText("Alex Ribeiro");
    await expect(v2.page.getByTestId("cv-document")).not.toContainText("alex@example.com");
    await expect(v2.page.getByTestId("cv-contact-hidden")).toBeVisible();
    await expect(v2.page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    await v2.ctx.close();

    // PIN: strangers get the gate; the wrong PIN stays out; the right one opens it and sticks for that browser.
    await page.getByTestId("publish-pin").fill("2468");
    await page.getByTestId("publish-pin-save").click();
    await expect(page.getByTestId("publish-has-pin")).toBeVisible();
    const v3 = await visitor(browser, url);
    await expect(v3.page.getByTestId("cv-pin")).toBeVisible();
    await expect(v3.page.getByTestId("cv-document")).toBeHidden();
    await v3.page.getByTestId("cv-pin-input").fill("0000");
    await v3.page.getByTestId("cv-pin-submit").click();
    await expect(v3.page.getByTestId("cv-pin-wrong")).toBeVisible();
    await v3.page.getByTestId("cv-pin-input").fill("2468");
    await v3.page.getByTestId("cv-pin-submit").click();
    await expect(v3.page.getByTestId("cv-document")).toContainText("Alex Ribeiro", { timeout: 10_000 });
    await v3.page.reload();
    await expect(v3.page.getByTestId("cv-document")).toContainText("Alex Ribeiro");
    await v3.ctx.close();

    // The owner sees the views (four visitor renders: open, hidden-contact, after the PIN, the reload), and opening their own page adds none.
    await page.getByTestId("publish-refresh").click();
    await expect(page.getByTestId("publish-views")).toContainText("4");
    await page.goto(url);
    await expect(page.getByTestId("cv-owner")).toContainText("4");
    await page.goBack();

    // Library lists it.
    await page.goto("/library");
    await expect(page.getByTestId("library-public-item")).toHaveCount(1);
    await expect(page.getByTestId("library-public-item")).toContainText(/Alex Ribeiro/);
    await expect(page.getByTestId("library-public-item")).toHaveAttribute("data-enabled", "1");

    // Off: the link dies for everyone, the slug is kept for when it comes back.
    await page.getByRole("link", { name: /^open$|^abrir$/i }).first().click();
    await expect(page.getByTestId("publish")).toBeVisible();
    await page.getByTestId("publish-toggle").uncheck();
    await expect(page.getByTestId("publish")).toHaveAttribute("data-enabled", "0");
    const v4 = await visitor(browser, url);
    expect(v4.status).toBe(404);
    await v4.ctx.close();
    await page.getByTestId("publish-toggle").check();
    await expect(page.getByTestId("publish-url")).toHaveValue(url);
  });

  test("a locked kit cannot be published, and nobody else can touch the page settings", async ({ page, request }) => {
    await buildKitByText(page);
    await expect(page.getByTestId("publish")).toBeHidden();
    const id = await page.evaluate(() => localStorage.getItem("rt_last_gen"));
    const locked = await page.request.put(`/api/generations/${id}/publish`, { data: { enabled: true } });
    expect([401, 409]).toContain(locked.status());
    const stranger = await request.put(`/api/generations/${id}/publish`, { data: { enabled: true } });
    expect(stranger.status()).toBe(404);
    expect((await request.get("/cv/does-not-exist-000000")).status()).toBe(404);
  });
});
