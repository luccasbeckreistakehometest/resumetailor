import fs from "node:fs";
import { test, expect } from "./fixtures";
import { tailorKitByText, unlockedTailorKit } from "./helpers";

type W = { __rtVoiceHear: (t: string) => void; __rtVoiceTest: boolean };

test.describe("pitch studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as W).__rtVoiceTest = true; });
  });

  test("script → record a 3 s take on a fake camera → download it; nothing is uploaded; ratings are capped", async ({ page }) => {
    const { id } = await unlockedTailorKit(page);
    const uploads: string[] = [];
    page.on("request", (r) => {
      const type = r.headers()["content-type"] ?? "";
      if (r.method() !== "GET" && (/^(video|audio)\//.test(type) || (r.postDataBuffer()?.length ?? 0) > 50_000)) uploads.push(`${r.url()} ${type}`);
    });
    await page.getByTestId("pitch-link").first().click();
    await expect(page).toHaveURL(new RegExp(`/pitch/${id}$`));
    await page.getByTestId("pitch-write").click();
    await expect(page.getByTestId("pitch-text")).toHaveValue(/\[demo · 60s\]/);
    // The second fetch comes from the cache (no new AI call).
    const again = await (await page.request.post(`/api/generations/${id}/pitch`, { data: { seconds: 60 } })).json();
    expect(again.cached).toBe(true);

    await page.getByTestId("pitch-record").click();
    await expect(page.getByTestId("pitch-stop")).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => (window as unknown as W).__rtVoiceHear("Hi, I'm Alex, um, and like, I grew qualified pipeline 38% at Acme with a team of four people."));
    await page.waitForTimeout(3000);
    await page.getByTestId("pitch-stop").click();
    const link = page.getByTestId("pitch-download");
    await expect(link).toBeVisible({ timeout: 10_000 });
    expect(Number(await link.getAttribute("data-size"))).toBeGreaterThan(0);
    const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(fs.statSync(await download.path()).size).toBeGreaterThan(0);
    expect(download.suggestedFilename()).toMatch(/^pitch-60s\.(webm|mp4)$/);
    await expect(page.getByTestId("delivery-fillers")).toContainText("um ×1, like ×1");

    await page.getByTestId("pitch-rate").click();
    await expect(page.getByTestId("pitch-feedback")).toContainText("/10");
    await expect(page.getByTestId("pitch-left")).toContainText("4");
    expect(uploads).toEqual([]);

    const body = { seconds: 20, transcript: "Hi, I'm Alex and I grew pipeline 38% at Acme with a team of four.", target: 60 };
    for (let i = 0; i < 4; i++) expect((await page.request.post(`/api/generations/${id}/pitch/feedback`, { data: body })).status()).toBe(200);
    expect((await page.request.post(`/api/generations/${id}/pitch/feedback`, { data: body })).status()).toBe(429);
  });

  test("a locked kit gets the template script and the unlock button", async ({ page }) => {
    const id = await tailorKitByText(page);
    await page.goto(`/pitch/${id}`);
    await expect(page.getByTestId("pitch-template")).toBeVisible();
    await expect(page.getByTestId("pitch-text")).toHaveValue(/Alex/);
    await expect(page.getByTestId("pitch-unlock")).toBeVisible();
    await expect(page.getByTestId("pitch-write")).toHaveCount(0);
    expect((await page.request.post(`/api/generations/${id}/pitch`, { data: { seconds: 60 } })).status()).toBe(403);
    expect((await page.request.post(`/api/generations/${id}/pitch/feedback`, { data: { seconds: 20, transcript: "x".repeat(30) } })).status()).toBe(403);
  });
});
