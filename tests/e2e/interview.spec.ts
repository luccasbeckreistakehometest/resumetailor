import { test, expect } from "./fixtures";
import { buildKitByText, login, signOut, signUp } from "./helpers";

const VOICE_ANSWER = "At Acme I led the lifecycle programme for two years. Pipeline had stalled, so I rebuilt the segmentation and ran weekly A/B tests. Qualified pipeline grew 38 percent in 12 months and I handed the playbook to sales.";
const TYPED_ANSWER = "The failed campaign was a paid push to cold audiences in 2024. I paused it after one week, moved the budget to retargeting, and the cost per lead fell by 40 percent. What I changed was to test the audience before the creative.";

test.describe("mock interview", () => {
  test.beforeEach(async ({ page }) => {
    // No microphone in CI: the speech hook exposes a feed when the test flag is set.
    await page.addInitScript(() => { (window as unknown as { __rtVoiceTest: boolean }).__rtVoiceTest = true; });
  });

  test("locked kit: two-question preview, one answer by voice and one typed, scored, summarised, upsold", async ({ page }) => {
    await buildKitByText(page);
    await page.getByTestId("practice").first().click();
    await expect(page).toHaveURL(/\/interview\//);
    await expect(page.getByTestId("interview-intro")).toContainText(/2/);
    await page.getByTestId("interview-start").click();
    await expect(page.getByTestId("interview-question")).toContainText(/1 of 2|1 de 2/);
    await expect(page).toHaveURL(/session=int_/);

    // Voice answer: the hook is listening; the test feeds the transcript.
    await page.getByTestId("answer-voice").click();
    await expect(page.getByTestId("answer-stop")).toBeVisible();
    await page.evaluate((t) => (window as unknown as { __rtVoiceFeed: (t: string) => void }).__rtVoiceFeed(t), VOICE_ANSWER);
    await expect(page.getByTestId("answer-score")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("score-overall")).toHaveText(/^\d+(\.\d)?$/);
    // Spoken answers also get pace and filler words.
    await expect(page.getByTestId("delivery-pace")).toContainText(/Pace|Ritmo/);
    await expect(page.getByTestId("delivery-fillers")).toContainText(/Filler words|Vícios/);
    await page.getByTestId("model-toggle").click();
    await expect(page.getByTestId("model-answer")).not.toBeEmpty();
    await page.getByTestId("answer-next").click();

    // Typed answer closes the preview.
    await expect(page.getByTestId("interview-question")).toContainText(/2 of 2|2 de 2/);
    await page.getByTestId("answer-type").click();
    await page.getByTestId("answer-text").fill(TYPED_ANSWER);
    await page.getByTestId("answer-submit").click();
    await expect(page.getByTestId("answer-score")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("see-summary").click();
    await expect(page.getByTestId("interview-summary")).toBeVisible();
    await expect(page.getByTestId("summary-row")).toHaveCount(2);
    await expect(page.getByTestId("summary-weakest")).toBeVisible();
    await expect(page.getByTestId("interview-unlock")).toBeVisible();

    // The session is saved: a reload lands on the same summary.
    await page.reload();
    await expect(page.getByTestId("interview-summary")).toBeVisible();
    await expect(page.getByTestId("summary-row")).toHaveCount(2);
  });

  test("a thin answer is refused before it costs anything", async ({ page }) => {
    await buildKitByText(page);
    await page.getByTestId("practice").first().click();
    await page.getByTestId("interview-start").click();
    await page.getByTestId("answer-type").click();
    await page.getByTestId("answer-text").fill("yes");
    await page.getByTestId("answer-submit").click();
    await expect(page.getByTestId("answer-error")).toContainText(/a little more|um pouco mais|un poco más/i);
    await expect(page.getByTestId("answer-score")).toBeHidden();
  });

  test("unlocked kit: the full interview, finished early, lands in the library and the admin count", async ({ page }) => {
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    const user = await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("practice").first().click();
    await expect(page.getByTestId("interview-intro")).not.toContainText(/free preview|prévia grátis|vista previa gratis/i);
    await page.getByTestId("interview-start").click();
    await expect(page.getByTestId("interview-question")).toContainText(/1 of [3-8]|1 de [3-8]/);
    await page.getByTestId("answer-type").click();
    await page.getByTestId("answer-text").fill(TYPED_ANSWER);
    await page.getByTestId("answer-submit").click();
    await expect(page.getByTestId("answer-score")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("answer-finish").click();
    await expect(page.getByTestId("interview-summary")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("summary-row")).toHaveCount(1);
    await expect(page.getByTestId("interview-unlock")).toBeHidden();

    await page.goto("/library");
    await expect(page.getByTestId("session-item")).toHaveCount(1);
    await expect(page.getByTestId("session-item")).toContainText(/completed|concluída|completada/i);

    await signOut(page);
    await login(page, "admin@resumetailor.app", "resumetailor2026");
    await page.goto("/admin");
    await expect(page.getByTestId("admin-totals")).toContainText(/Interviews|Entrevistas/);
    await page.getByRole("button", { name: /^interviews|^entrevistas/i }).click();
    await expect(page.getByTestId("admin-table")).toContainText(user.email);
  });
});
