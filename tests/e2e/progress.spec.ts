import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { buildKitByText } from "./helpers";

const THIN = "I did some marketing work and helped the team with campaigns and reports.";
const FULL = "At Acme I led the lifecycle programme for 2 years. Pipeline had stalled, so I rebuilt the segmentation into 5 cohorts and ran 40 A/B tests. Qualified pipeline grew 38 percent in 12 months and I handed the playbook to the 4 people on my team.";

/** Runs one two-question preview session through the API and returns its overall score. */
async function session(page: Page, generationId: string, answer: string): Promise<number> {
  const s = await (await page.request.post("/api/interview", { data: { generationId } })).json();
  await page.request.post(`/api/interview/${s.id}/answer`, { data: { questionIdx: 0, answer, source: "text" } });
  const done = await (await page.request.post(`/api/interview/${s.id}/answer`, { data: { questionIdx: 1, answer, source: "text" } })).json();
  expect(done.status).toBe("done");
  return done.aggregate.overall as number;
}

test("two sessions on a kit draw a trend, name the weakest dimension and the next rehearsal, and surface on the library", async ({ page }) => {
  await page.goto("/interview");
  await expect(page.getByTestId("progress-empty")).toBeVisible();

  await buildKitByText(page);
  const id = (await page.evaluate(() => localStorage.getItem("rt_last_gen")))!;
  const first = await session(page, id, THIN);
  const second = await session(page, id, FULL);
  expect(second).toBeGreaterThan(first);

  await page.goto("/interview");
  await expect(page.getByTestId("progress-tiles")).toBeVisible();
  await expect(page.getByTestId("progress-sessions")).toHaveText("2");
  await expect(page.getByTestId("progress-latest")).toContainText(String(second));
  const delta = Number(await page.getByTestId("progress-delta").getAttribute("data-delta"));
  expect(delta).toBeCloseTo(Math.round((second - first) * 10) / 10, 1);
  await expect(page.getByTestId("progress-delta")).toContainText("▲");
  await expect(page.getByTestId("progress-svg").locator("path")).toHaveCount(1);
  await expect(page.getByTestId("progress-svg").locator("circle")).toHaveCount(2);
  await expect(page.getByTestId("progress-strongest")).not.toBeEmpty();
  await expect(page.getByTestId("progress-weakest")).not.toBeEmpty();
  await expect(page.getByTestId("progress-next")).toContainText(await page.getByTestId("progress-weakest").innerText());
  await expect(page.getByTestId("progress-kit")).toHaveCount(1);
  await expect(page.getByTestId("progress-kit")).toContainText("Alex Ribeiro");

  await page.getByTestId("progress-practise").click();
  await expect(page).toHaveURL(new RegExp(`/interview/${id}`));

  await page.goto("/library");
  await expect(page.getByTestId("library-trend")).toBeVisible();
  await expect(page.getByTestId("library-trend")).toContainText(String(second));
  await expect(page.getByTestId("library-trend-delta")).toContainText("▲");
  await page.getByTestId("library-trend").click();
  await expect(page).toHaveURL(/\/interview$/);

  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/interview\s*$/m);
});
