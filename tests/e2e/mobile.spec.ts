import { test, expect } from "./fixtures";
import { signUp, skipTour } from "./helpers";

const PAGES = ["/", "/start", "/pricing", "/fit", "/ats-check", "/library", "/applications", "/interview", "/account", "/contact", "/legal/privacy", "/lp/jobseeker", "/login"];

test.describe("phone width", () => {
  test("no page scrolls sideways", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("the menu carries navigation, credits and sign-out", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    await expect(page.getByTestId("menu-open")).toBeVisible();
    await page.getByTestId("menu-open").click();
    const menu = page.getByTestId("mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Privacy" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await page.getByTestId("menu-open").click();
    await page.getByTestId("menu-signin").click();
    await expect(page.getByTestId("auth-modal")).toHaveAttribute("data-mode", "in");
    await signUp(page);
    await expect(page.getByTestId("credits")).toBeVisible();
    await page.getByTestId("menu-open").click();
    await expect(page.getByTestId("menu-credits")).toContainText("1 credit");
    await page.getByTestId("menu-library").click();
    await expect(page).toHaveURL(/\/library/);
    await page.getByTestId("menu-open").click();
    await page.getByTestId("menu-signout").click();
    await expect(page.getByTestId("open-auth")).toBeVisible();
    expect((await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user).toBeNull();
  });

  test("the six-step tour fits the phone screen and never spotlights an empty box", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tour-start").click();
    const width = page.viewportSize()!.width;
    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId("tour-step")).toHaveAttribute("data-step", String(i), { timeout: 10_000 });
      await page.waitForTimeout(300);
      const box = await page.getByTestId("tour-step").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const hole = page.getByTestId("tour-hole");
      if (await hole.count()) { const h = await hole.boundingBox(); expect(h!.width * h!.height).toBeGreaterThan(0); }
      await page.getByTestId("tour-next").click();
    }
    await expect(page.getByTestId("tour-step")).toBeHidden();
  });
});
