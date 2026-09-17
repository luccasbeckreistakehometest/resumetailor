import { test, expect } from "@playwright/test";
import { buildKitByText, signUp } from "./helpers";

test.describe("letters by tone and recruiter emails", () => {
  // Headless Chromium only writes to the clipboard once the permission is granted.
  test.beforeEach(async ({ context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); });

  test("an unlocked kit rewrites the letter per tone, caches it, and writes the three emails", async ({ page }) => {
    await buildKitByText(page);
    await expect(page.getByTestId("letters")).toBeHidden();
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("letter")).toHaveAttribute("data-tone", "original");
    const original = await page.getByTestId("letter-body").innerText();
    expect(original).toContain("Dear Hiring Team");

    await page.getByTestId("tone-warm").click();
    await expect(page.getByTestId("letter")).toHaveAttribute("data-tone", "warm", { timeout: 15_000 });
    const warm = await page.getByTestId("letter-body").innerText();
    expect(warm).not.toEqual(original);
    expect(warm).toContain("[demo · warm]");
    await expect(page.getByTestId("letter-cached")).toBeHidden();

    await page.getByTestId("tone-direct").click();
    await expect(page.getByTestId("letter")).toHaveAttribute("data-tone", "direct", { timeout: 15_000 });
    await expect(page.getByTestId("letter-body")).toContainText("[demo · direct]");

    // Reopening the kit finds the tones already written: served from the cache, marked as such.
    const id = await page.evaluate(() => localStorage.getItem("rt_last_gen"));
    await page.goto(`/start?gen=${id}`);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("tone-warm").click();
    await expect(page.getByTestId("letter-body")).toContainText("[demo · warm]");
    await expect(page.getByTestId("letter-cached")).toBeVisible();
    await page.getByTestId("letter-copy").click();
    await expect(page.getByTestId("letter-copy")).toContainText(/copied|copiado/i);

    await page.getByTestId("email-thanks").click();
    await expect(page.getByTestId("email")).toHaveAttribute("data-kind", "thanks", { timeout: 15_000 });
    await expect(page.getByTestId("email-subject")).toContainText(/thank you/i);
    await expect(page.getByTestId("email-body")).toContainText("[the topic we discussed]");
    await expect(page.getByTestId("email-mailto")).toHaveAttribute("href", /^mailto:\?subject=Thank/);
    await page.getByTestId("email-applied").click();
    await expect(page.getByTestId("email-subject")).toContainText(/application from Alex Ribeiro/, { timeout: 15_000 });
    await page.getByTestId("email-nudge").click();
    await expect(page.getByTestId("email-subject")).toContainText(/following up/i, { timeout: 15_000 });

    // Reopened later, every email is already there.
    await page.goto(`/start?gen=${id}`);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("email-thanks").click();
    await expect(page.getByTestId("email-subject")).toContainText(/thank you/i);
    await expect(page.getByTestId("email-cached")).toBeVisible();
  });

  test("a locked kit gets no variants from the API", async ({ page }) => {
    await buildKitByText(page);
    const id = await page.evaluate(() => localStorage.getItem("rt_last_gen"));
    const r = await page.request.post(`/api/generations/${id}/variants`, { data: { kind: "cover:warm" } });
    expect(r.status()).toBe(409);
    const list = await page.request.get(`/api/generations/${id}/variants`);
    expect((await list.json()).items).toEqual([]);
  });
});
