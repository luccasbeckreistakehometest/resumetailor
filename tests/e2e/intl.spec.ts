import { test, expect } from "./fixtures";
import { BUILD_PROFILE, SAMPLE_JOB, SAMPLE_RESUME, signUp, skipTour, tailorKitByText } from "./helpers";

test.describe("international version", () => {
  test("a Portuguese kit gets an English version that prints and exports; a third language is refused; locked kits are refused", async ({ page, browser }) => {
    // A kit written in Portuguese: the app follows the language chosen on /pt.
    await page.goto("/pt");
    await skipTour(page);
    await page.goto("/start?lang=pt");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-tailor").click();
    await page.getByTestId("role").fill("Gerente de Marketing");
    await page.getByTestId("next").click();
    await page.getByTestId("job").fill(SAMPLE_JOB);
    await page.getByTestId("next").click();
    await page.getByTestId("resume").fill(SAMPLE_RESUME);
    await page.getByTestId("next").click();
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
    const id = await page.evaluate(() => localStorage.getItem("rt_last_gen"));
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("intl-pt")).toHaveCount(0);
    await page.getByTestId("intl-en").click();
    const result = page.getByTestId("intl-result");
    await expect(result).toHaveAttribute("data-target", "en");
    await expect(page.getByTestId("intl-numbers")).toContainText(/Todos os números/);
    const [print] = await Promise.all([page.waitForEvent("popup"), page.getByTestId("intl-print").click()]);
    await expect(print.getByTestId("document")).toContainText("International version");
    const docx = await page.request.get(`/api/generations/${id}/export?variant=intl:en&doc=resume&format=docx`);
    expect(docx.status()).toBe(200);
    expect(docx.headers()["content-disposition"]).toContain('filename="Resume-');

    // KIT_INTL_MAX=1 on the test server: a second language is refused.
    await page.getByTestId("intl-es").click();
    await expect(page.getByTestId("intl").getByRole("alert")).toContainText("versões internacionais");
    // The kit's own language is not a target.
    expect((await page.request.post(`/api/generations/${id}/intl`, { data: { target: "pt" } })).status()).toBe(400);
    // Asking again for a language already made is free and cached.
    expect((await (await page.request.post(`/api/generations/${id}/intl`, { data: { target: "en" } })).json()).cached).toBe(true);

    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.204.0.2" } });
    const stranger = await other.newPage();
    const lockedId = await tailorKitByText(stranger);
    expect((await stranger.request.post(`/api/generations/${lockedId}/intl`, { data: { target: "es" } })).status()).toBe(403);
    await expect(stranger.getByTestId("intl-locked")).toHaveCount(0);   // shown only inside an unlocked kit card
    await other.close();
    void BUILD_PROFILE;
  });

  test("past the cap a new language is 429, and nothing counts when it fails", async ({ page }) => {
    const { unlockedTailorKit } = await import("./helpers");
    const { id } = await unlockedTailorKit(page);
    expect((await page.request.post(`/api/generations/${id}/intl`, { data: { target: "pt" } })).status()).toBe(200);
    expect((await page.request.post(`/api/generations/${id}/intl`, { data: { target: "es" } })).status()).toBe(429);
    const kit = await (await page.request.get(`/api/generations/${id}/intl?target=pt`)).json();
    expect(kit.left).toBe(0);
    expect(kit.version.notes.length).toBeGreaterThan(0);
  });
});
