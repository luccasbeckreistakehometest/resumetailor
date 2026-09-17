import { test, expect } from "./fixtures";
import { SAMPLE_JOB, SAMPLE_RESUME, skipTour, unlockedTailorKit } from "./helpers";

test.describe("saved base résumé", () => {
  test("the second kit needs only the role and the posting; 'new job' starts at the posting; deleting clears the pre-fill", async ({ page }) => {
    const first = await unlockedTailorKit(page);

    // Kit #2: the résumé step is skipped and the chip says why.
    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-tailor").click();
    await page.getByTestId("role").fill("Lifecycle Lead");
    await page.getByTestId("next").click();
    await expect(page.getByTestId("saved-resume-chip")).toBeVisible();
    await page.getByTestId("job").fill(SAMPLE_JOB);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith("/api/generate")),
      page.getByTestId("next").click(),
    ]);
    expect(JSON.parse(req.postData() ?? "{}").resume).toBe(SAMPLE_RESUME);
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });

    // "Changing" brings the paste step back with the text in it.
    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-improve").click();
    await expect(page.getByTestId("saved-resume-chip")).toBeVisible();
    await page.getByTestId("saved-resume-change").click();
    await page.getByTestId("role").fill("Growth Lead");
    await page.getByTestId("next").click();
    await expect(page.getByTestId("resume")).toHaveValue(SAMPLE_RESUME);

    // From kit #1 (unlocked): lands on the posting step with that kit's résumé.
    await page.goto(`/start?gen=${first.id}`);
    await page.getByTestId("new-job").click();
    await expect(page.getByTestId("job")).toBeVisible();
    await expect(page.getByTestId("job")).toHaveValue("");
    await expect(page.getByTestId("saved-resume-chip")).toBeVisible();
    await expect(page.getByTestId("role")).toHaveCount(0);

    // The library shows the base résumé; deleting it removes the pre-fill.
    await page.goto("/library");
    await expect(page.getByTestId("base-resume-text")).toHaveValue(SAMPLE_RESUME);
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("base-resume-delete").click();
    await expect(page.getByTestId("base-resume-text")).toHaveCount(0);
    await page.goto("/start");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-improve").click();
    await expect(page.getByTestId("saved-resume-chip")).toHaveCount(0);
    await page.getByTestId("role").fill("Growth Lead");
    await page.getByTestId("next").click();
    await expect(page.getByTestId("resume")).toHaveValue("");
  });

  test("a visitor's saved résumé moves to the account at signup, and the API only ever answers for the cookie's owner", async ({ page, browser }) => {
    await page.goto("/");
    await skipTour(page);
    const put = await page.request.put("/api/profile", { data: { resume: SAMPLE_RESUME, facts: { tools: ["Power BI"] } } });
    expect(put.status()).toBe(200);
    await page.goto("/signup");
    const { signUp } = await import("./helpers");
    await signUp(page);
    const mine = await (await page.request.get("/api/profile")).json();
    expect(mine.profile.resume).toBe(SAMPLE_RESUME);
    expect(mine.profile.facts.tools).toEqual(["Power BI"]);

    const stranger = await browser.newContext();
    const other = await stranger.request.get("http://localhost:3100/api/profile");
    expect((await other.json()).profile).toBeNull();
    // Writing from another cookie only ever touches that cookie's own profile.
    expect((await stranger.request.put("http://localhost:3100/api/profile", { data: { resume: "Someone else entirely — a different résumé text." } })).status()).toBe(200);
    expect((await (await page.request.get("/api/profile")).json()).profile.resume).toBe(SAMPLE_RESUME);
    await stranger.close();
    // A brand-new visitor (no cookie yet) cannot write one.
    const fresh = await browser.newContext();
    expect((await fresh.request.put("http://localhost:3100/api/profile", { data: { resume: SAMPLE_RESUME } })).status()).toBe(403);
    await fresh.close();
  });

  test("profile writes are capped per IP (30 an hour), however many cookies are used", async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.204.0.31" } });
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      await ctx.clearCookies();
      await ctx.request.get("http://localhost:3100/api/profile");
      statuses.push((await ctx.request.put("http://localhost:3100/api/profile", { data: { resume: `Profile number ${i} — some résumé text here.` } })).status());
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
    await ctx.close();
  });
});
