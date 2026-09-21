import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

test.describe("landing", () => {
  test("renders with its own identity and routes to the app", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await skipTour(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(/interview|entrevista/i);
    // The document face is the identity — it must actually be applied, not just declared.
    // Source Serif 4 replaced Fraunces in September 2026 (docs/DESIGN.md §3.4).
    const font = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain("source serif 4");
    await page.getByRole("link", { name: /match score|nota/i }).first().click();
    await expect(page).toHaveURL(/\/start/);
    expect(errors).toEqual([]);
  });

  test("pt-BR copy is its own, not a translation", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    await page.goto("/");
    const en = await page.locator("h1").innerText();
    // The home page exists at /pt and /es: the switcher goes there instead of swapping in place.
    await page.getByRole("button", { name: "PT" }).click();
    await expect(page).toHaveURL(/\/pt$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    const pt = await page.locator("h1").innerText();
    await page.getByRole("button", { name: "ES" }).click();
    await expect(page).toHaveURL(/\/es$/);
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
      await expect(page.getByTestId("lp-cta")).toHaveText(/start free|match score/i);
      await expect(page.getByTestId("showcase-card").first()).toBeVisible();
      await expect(page.getByTestId("lp-ats")).toHaveAttribute("href", /ats-check/);
    }
  });
});
