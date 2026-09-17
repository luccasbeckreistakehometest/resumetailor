import { test, expect } from "./fixtures";

test("first visit offers the tour, it walks across pages, and never comes back once done", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("tour-welcome")).toBeVisible();
  await page.getByTestId("tour-start").click();
  await expect(page.getByTestId("tour-step")).toHaveAttribute("data-step", "0");
  const total = Number(await page.getByTestId("tour-step").getAttribute("data-total"));
  expect(total).toBeGreaterThanOrEqual(5);
  expect(total).toBeLessThanOrEqual(6);

  const visited: string[] = [];
  for (let i = 1; i < total; i++) {
    await page.getByTestId("tour-next").click();
    await expect(page.getByTestId("tour-step")).toHaveAttribute("data-step", String(i));
    await page.waitForTimeout(200);
    visited.push(new URL(page.url()).pathname);
  }
  // step 1 is on /start (the tour went there itself); the free tools and the finale are on the hub
  expect(visited[0]).toBe("/tools");
  expect(visited).toContain("/library");
  expect(visited[visited.length - 1]).toBe("/tools");
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

test.describe("tour on a small phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("never spotlights an empty box, and ends in six steps or fewer", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("tour-start").click();
    let steps = 0;
    for (let i = 0; i < 8; i++) {
      const step = page.getByTestId("tour-step");
      if (!(await step.isVisible().catch(() => false))) break;
      steps++;
      await page.waitForTimeout(400);
      const hole = page.getByTestId("tour-hole");
      if (await hole.count()) {
        const box = await hole.boundingBox();
        expect(box && box.width > 0 && box.height > 0).toBe(true);
      }
      await page.getByTestId("tour-next").click();
      await page.waitForTimeout(300);
    }
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThanOrEqual(6);
  });
});
