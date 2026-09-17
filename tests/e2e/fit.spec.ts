import { test, expect } from "@playwright/test";
import { skipTour } from "./helpers";

const POSTING = `Growth Marketing Manager
We need a Growth Marketing Manager who lives in HubSpot: HubSpot workflows, HubSpot reporting, HubSpot lifecycle programmes.
Requirements: SQL for pipeline dashboards, SQL reporting; Salesforce administration, Salesforce reporting, Salesforce hygiene; A/B testing; team leadership.`;
const RESUME = `Alex Ribeiro
alex@example.com · São Paulo
- Ran lifecycle campaigns in HubSpot, growing qualified pipeline 38% YoY
- Built the SQL dashboards the sales team uses for pipeline reviews
- Led a team of four across paid, CRM and content`;

test.describe("am I a fit?", () => {
  test("judges the posting's must-haves against the résumé, carries both into the kit flow, answers repeats from cache, and caps new checks", async ({ page }) => {
    await page.goto("/fit");
    await skipTour(page);
    await page.goto("/fit");
    await expect(page.locator("h1")).toContainText(/fit|encaixo/i);
    await expect(page.getByTestId("fit-reuse")).toBeHidden();

    await page.getByTestId("fit-run").click();
    await expect(page.getByTestId("fit-error")).toBeVisible();

    await page.getByTestId("fit-posting").fill(POSTING);
    await page.getByTestId("fit-resume").fill(RESUME);
    await page.getByTestId("fit-run").click();
    await expect(page.getByTestId("fit-result")).toBeVisible({ timeout: 20_000 });
    const score = Number(await page.getByTestId("fit-score").innerText());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    await expect(page.getByTestId("fit-item").filter({ hasText: /hubspot/i })).toHaveAttribute("data-status", "found");
    await expect(page.getByTestId("fit-item").filter({ hasText: /salesforce/i })).toHaveAttribute("data-status", "missing");
    await expect(page.getByTestId("fit-evidence").first()).toContainText(/HubSpot|SQL|team/);
    expect(await page.getByTestId("fit-gap").count()).toBeLessThanOrEqual(3);
    expect(await page.getByTestId("fit-gap").count()).toBeGreaterThan(0);
    await expect(page.getByTestId("fit-gap").filter({ hasText: /salesforce/i })).toHaveCount(1);
    await expect(page.getByTestId("fit-cached")).toBeHidden();
    await expect(page.getByTestId("fit-runs-left")).toContainText("2");

    // Same pair again: served from memory, nothing used up.
    await page.getByTestId("fit-run").click();
    await expect(page.getByTestId("fit-cached")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("fit-runs-left")).toContainText("2");

    // The CTA lands on the résumé step with everything filled in; one click makes the kit.
    await page.getByTestId("fit-cta").click();
    await expect(page).toHaveURL(/\/start\?from=fit/);
    await expect(page.getByTestId("fit-carried")).toBeVisible();
    await expect(page.getByTestId("resume")).toHaveValue(/Alex Ribeiro/);
    await page.getByTestId("next").click();
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("personalisation")).toBeVisible();

    // …and the kit's posting and résumé can be reused on the next check.
    await page.goto("/fit");
    await page.getByTestId("fit-reuse").click();
    await expect(page.getByTestId("fit-posting")).toHaveValue(/Growth Marketing Manager/);
    await expect(page.getByTestId("fit-resume")).toHaveValue(/Alex Ribeiro/);

    // FIT_CHECKS_PER_DAY=3 on the test server: two more new pairs are fine, the fourth is refused.
    for (const n of [2, 3]) {
      await page.getByTestId("fit-posting").fill(`${POSTING}\nVariant ${n}: also Marketo and Marketo automation.`);
      await page.getByTestId("fit-run").click();
      await expect(page.getByTestId("fit-runs-left")).toContainText(String(3 - n), { timeout: 20_000 });
    }
    await page.getByTestId("fit-posting").fill(`${POSTING}\nVariant 4: also Tableau.`);
    await page.getByTestId("fit-run").click();
    await expect(page.getByTestId("fit-limit")).toBeVisible();
    // a cached pair still answers while capped
    await page.getByTestId("fit-posting").fill(POSTING);
    await page.getByTestId("fit-run").click();
    await expect(page.getByTestId("fit-cached")).toBeVisible({ timeout: 20_000 });
  });

  test("/fit is public: indexable metadata, in the sitemap, linked from the header", async ({ page, request }) => {
    const html = await (await request.get("/fit")).text();
    expect(html).toMatch(/<title>Am I a fit/);
    expect(html).not.toMatch(/noindex/);
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/fit");
    await page.goto("/");
    await skipTour(page);
    await page.goto("/");
    await page.getByTestId("nav-fit").click();
    await expect(page).toHaveURL(/\/fit$/);
  });
});
