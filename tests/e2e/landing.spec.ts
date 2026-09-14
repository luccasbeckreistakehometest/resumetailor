import { test, expect } from "@playwright/test";
import { skipTour } from "./helpers";

test.describe("landing", () => {
  test("renders with its own identity and routes to the app", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await skipTour(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(/interview|entrevista/i);
    // serif display face is the identity — it must actually be applied
    const font = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain("fraunces");
    await page.getByRole("link", { name: /match score|nota/i }).first().click();
    await expect(page).toHaveURL(/\/start/);
    expect(errors).toEqual([]);
  });

  test("pt-BR copy is its own, not a translation", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    await page.goto("/");
    const en = await page.locator("h1").innerText();
    await page.getByRole("button", { name: "PT" }).click();
    const pt = await page.locator("h1").innerText();
    await page.getByRole("button", { name: "ES" }).click();
    const es = await page.locator("h1").innerText();
    expect(pt).not.toEqual(en);
    expect(es).not.toEqual(en);
    expect(pt).not.toEqual(es);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("ad funnels render each angle", async ({ page }) => {
    await page.goto("/"); await skipTour(page);
    for (const slug of ["jobseeker", "firstjob", "careerchange", "vschatgpt"]) {
      await page.goto(`/lp/${slug}`);
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.getByRole("link", { name: /start free|match score/i })).toBeVisible();
    }
  });
});
