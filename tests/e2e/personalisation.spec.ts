import { test, expect } from "./fixtures";
import { signUp, skipTour, unlockedTailorKit } from "./helpers";

// A posting whose vocabulary the demo kit barely touches, so the first draft reads generic.
const POSTING = `Demand Generation Manager
Own demand generation end to end: Salesforce and Marketo administration, webinar programmes, SEO and Google Ads, account-based marketing for enterprise accounts, MQL targets and SDR alignment, budget forecasting, agency management, nurture sequences and landing pages, LinkedIn Ads, ROI reporting to the board. Webinar programmes and account-based marketing are the core of the role; Salesforce and Marketo are must-haves.`;
const RESUME = `Alex Ribeiro — growth marketer. Six years in lifecycle campaigns, CRM and content. Led a team of four. HubSpot, SQL, A/B testing, copywriting. BA Marketing, USP.`;

const score = async (page: import("@playwright/test").Page) => Number((await page.getByTestId("pers-score").innerText()).replace(/\D/g, ""));

test("a tailored kit shows how generic it is, goes deeper on the posting, and stops at the limit", async ({ page }) => {
  await page.goto("/");
  await skipTour(page);
  await page.goto("/start");
  await page.getByTestId("via-text").click();
  await page.getByTestId("mode-tailor").click();
  await page.getByTestId("role").fill("Demand Generation Manager");
  await page.getByTestId("next").click();
  await page.getByTestId("job").fill(POSTING);
  await page.getByTestId("next").click();
  await page.getByTestId("resume").fill(RESUME);
  await page.getByTestId("next").click();
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId("personalisation")).toHaveAttribute("data-generic", "1");
  await expect(page.getByTestId("pers-generic")).toBeVisible();
  await expect(page.getByTestId("pers-missing")).toContainText(/salesforce|marketo/);
  const before = await score(page);

  // Locked: the meter is honest about how generic the draft is, but going deeper is another full
  // generation, so it waits for the unlock instead of offering a working button.
  await expect(page.getByTestId("deepen-locked")).toBeVisible();
  await expect(page.getByTestId("deepen")).toBeHidden();
  expect((await page.request.post(`/api/generations/${await page.evaluate(() => localStorage.getItem("rt_last_gen") ?? "")}/deepen`)).status()).toBe(403);
  await page.getByTestId("unlock").click();
  await signUp(page);
  await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("deepen").click();
  await expect(page.getByTestId("personalisation")).toHaveAttribute("data-generic", "0", { timeout: 30_000 });
  const after = await score(page);
  expect(after).toBeGreaterThan(before);
  await expect(page.getByTestId("pers-generic")).toBeHidden();

  // second pass allowed, third is not (KIT_DEEPEN_MAX defaults to 2)
  await page.getByTestId("deepen").click();
  await expect(page.getByTestId("deepen-limit")).toBeVisible({ timeout: 30_000 });

  // the deepened kit is what the library reopens
  await page.goto("/library");
  // An unlocked kit's visible action in the library is "Edit résumé"; Open moved into the row
  // menu when each row was cut to one action (docs/DESIGN.md surface 8).
  await page.getByTestId("library-more").first().click();
  await page.getByRole("menuitem", { name: /^open$|^abrir$/i }).click();
  await expect(page.getByTestId("personalisation")).toHaveAttribute("data-generic", "0");
  await expect(page.getByTestId("deepen-limit")).toBeVisible();
});

test("a kit built without a posting has no meter", async ({ page }) => {
  await page.goto("/");
  await skipTour(page);
  await page.goto("/start");
  await page.getByTestId("via-text").click();
  await page.getByTestId("mode-improve").click();
  await page.getByTestId("role").fill("Marketing Analyst");
  await page.getByTestId("next").click();
  await page.getByTestId("resume").fill(RESUME);
  await page.getByTestId("next").click();
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("personalisation")).toBeHidden();
});

test("parallel deepen requests on one kit never run more passes than the limit", async ({ page }) => {
  const { id } = await unlockedTailorKit(page, { email: `deepen${Date.now()}@example.com` });
  const codes = await Promise.all(Array.from({ length: 6 }, () => page.request.post(`/api/generations/${id}/deepen`).then((r) => r.status())));
  expect(codes.filter((c) => c === 200).length).toBeLessThanOrEqual(2);
  expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(4);
  const kit = await (await page.request.get(`/api/generations/${id}`)).json();
  expect(kit.deepened).toBe(codes.filter((c) => c === 200).length);
});
