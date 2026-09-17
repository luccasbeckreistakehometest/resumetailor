import { test, expect } from "./fixtures";
import { skipTour } from "./helpers";

test("voice flow: talk → understood → follow-up → confirm → kit", async ({ page }) => {
  // No microphone in CI: the component exposes a feed hook when the test flag is set.
  await page.addInitScript(() => { (window as unknown as { __rtVoiceTest: boolean }).__rtVoiceTest = true; });
  await page.goto("/start?via=voice");
  await skipTour(page);
  await page.goto("/start?via=voice");
  await expect(page.getByTestId("voice")).toBeVisible();
  await page.getByTestId("voice-start").click();
  await expect(page.getByTestId("voice-stop")).toBeVisible();

  // First turn is too thin: the listener asks a follow-up instead of finishing.
  await page.evaluate(() => (window as unknown as { __rtVoiceFeed: (t: string) => void }).__rtVoiceFeed("hi, I want a job"));
  await expect(page.getByTestId("voice-review")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("voice-prompt")).toContainText(/role|vaga|puesto/i);
  await expect(page.getByTestId("voice-confirm")).toBeDisabled();

  // Second turn completes the briefing.
  await page.getByTestId("voice-start").click();
  await page.evaluate(() => (window as unknown as { __rtVoiceFeed: (t: string) => void }).__rtVoiceFeed(
    "I'm looking for an entry-level marketing analyst role. I studied marketing, graduated in 2025, did an eight-month internship at a local agency, I'm good with Excel and Google Analytics and I speak English.",
  ));
  await expect(page.getByTestId("voice-confirm")).toBeEnabled({ timeout: 15_000 });
  await page.getByTestId("voice-confirm").click();
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("result")).toContainText(/by voice|por voz/i);
});
