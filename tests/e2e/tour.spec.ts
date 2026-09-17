import { test, expect } from "@playwright/test";

test("first visit offers the tour, it walks across pages, and never comes back once done", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("tour-welcome")).toBeVisible();
  await page.getByTestId("tour-start").click();
  await expect(page.getByTestId("tour-step")).toHaveAttribute("data-step", "0");
  const total = Number(await page.getByTestId("tour-step").getAttribute("data-total"));
  expect(total).toBeGreaterThanOrEqual(5);

  const visited: string[] = [];
  for (let i = 1; i < total; i++) {
    await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour-step")).toHaveAttribute("data-step", String(i));
    await page.waitForTimeout(200);
    visited.push(new URL(page.url()).pathname);
  }
  // step 2 lives on /start — the tour navigates there itself; the feature steps each open their own page
  expect(visited[0]).toBe("/start");
  expect(visited).toContain("/library");
  await page.getByTestId("tour-next").click();
  await expect(page.getByTestId("tour-step")).toBeHidden();

  // Saved server-side: a fresh page load in the same browser does not replay it.
  await page.goto("/");
  await page.waitForTimeout(800);
  await expect(page.getByTestId("tour-welcome")).toBeHidden();
  await expect(page.getByTestId("tour-step")).toBeHidden();
  const state = await page.evaluate(() => fetch("/api/tour").then((r) => r.json()));
  expect(state.tourCompleted).toBe(true);
});
