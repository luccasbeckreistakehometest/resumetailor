import { test, expect } from "@playwright/test";
import { buildKitByText, signUp } from "./helpers";

test.describe("full LinkedIn pass", () => {
  test.beforeEach(async ({ context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); });

  test("an unlocked kit gets headlines, About, experience, pinned skills and coverage; it is cached; a locked kit is gated", async ({ page }) => {
    await buildKitByText(page);
    const id = (await page.evaluate(() => localStorage.getItem("rt_last_gen")))!;
    await page.goto(`/linkedin/${id}`);
    await expect(page.getByTestId("li-locked")).toBeVisible();
    expect((await page.request.post(`/api/generations/${id}/linkedin`)).status()).toBe(409);

    await page.goto(`/start?gen=${id}`);
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("linkedin-link").click();
    await expect(page).toHaveURL(new RegExp(`/linkedin/${id}`));
    await expect(page.getByTestId("li-profile")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("li-cached")).toBeHidden();
    await expect(page.getByTestId("li-headline")).toHaveCount(3);
    await expect(page.getByTestId("li-headline").first()).toContainText("Marketing Analyst");
    await expect(page.getByTestId("li-about")).toContainText("[demo]");
    expect(await page.getByTestId("li-role").count()).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("li-skills")).toContainText("📌");
    const coverage = Number(await page.getByTestId("li-coverage").getAttribute("data-coverage"));
    expect(coverage).toBeGreaterThan(0);
    await expect(page.getByTestId("li-matched")).toContainText(/hubspot|pipeline|sql/i);

    await page.getByTestId("li-copy-all").click();
    await expect(page.getByTestId("li-copy-all")).toContainText(/copied|copiado/i);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("Marketing Analyst");

    // Cached: the second visit does not generate again.
    const posts: string[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/linkedin")) posts.push(r.url()); });
    await page.goto(`/linkedin/${id}`);
    await expect(page.getByTestId("li-profile")).toBeVisible();
    await expect(page.getByTestId("li-cached")).toBeVisible();
    expect(posts).toEqual([]);

    await page.goto("/library");
    await expect(page.getByTestId("library-linkedin")).toBeVisible();
    const robots = await (await page.request.get("/robots.txt")).text();
    expect(robots).toContain("/linkedin/");
  });
});
