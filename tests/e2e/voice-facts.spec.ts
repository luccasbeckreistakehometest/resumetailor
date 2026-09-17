import { test, expect } from "./fixtures";
import { SAMPLE_JOB, SAMPLE_RESUME, signUp, skipTour } from "./helpers";

type W = { __rtVoiceFeed: (t: string) => void; __rtVoiceHear: (t: string) => void; __rtVoiceTest: boolean };
const SAID = "Tenho currículo e uma vaga de analista de dados; aumentei a retenção em 12% com um dashboard em Power BI";

test.describe("voice briefing keeps what was said", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as W).__rtVoiceTest = true; });
  });

  test("tailor mode: the spoken facts reach the kit and are stored as candidate input", async ({ page }) => {
    await page.goto("/start?via=voice");
    await skipTour(page);
    await page.goto("/start?via=voice");
    await page.getByTestId("voice-start").click();
    await expect(page.getByTestId("voice-stop")).toBeVisible();
    // Words heard, then silence: the turn ends by itself.
    await page.evaluate((t) => (window as unknown as W).__rtVoiceHear(t), SAID);
    await expect(page.getByTestId("voice-review")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("voice-confirm")).toBeEnabled();
    // The optional follow-up opens the microphone again on its own.
    await expect(page.getByTestId("voice-stop")).toBeVisible({ timeout: 1_500 });
    await page.getByTestId("voice-confirm").click();

    const chip = page.getByTestId("spoken-chip");
    await expect(chip).toContainText("1 achievement · 1 tool");
    await page.getByTestId("job").fill(SAMPLE_JOB);
    await page.getByTestId("next").click();
    await page.getByTestId("resume").fill(SAMPLE_RESUME);
    const [req] = await Promise.all([page.waitForRequest((r) => r.url().endsWith("/api/generate")), page.getByTestId("next").click()]);
    const body = JSON.parse(req.postData() ?? "{}");
    expect(body.spokenFacts).toEqual(["aumentei a retenção em 12% com um dashboard em Power BI", "Power BI"]);
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    const id = await page.evaluate(() => localStorage.getItem("rt_last_gen"));
    expect((await (await page.request.get(`/api/generations/${id}`)).json()).matchNotes).toContain("Spoken facts: 2");
    const exported = await (await page.request.post("/api/account/export")).json();
    const spoken: string = exported.kits[0].input.spoken;
    expect(spoken).toContain("12%");
    expect(spoken).toContain("Power BI");
    // …and they joined the saved profile.
    const profile = await (await page.request.get("/api/profile")).json();
    expect(profile.profile.facts.tools).toContain("Power BI");
  });

  test("someone else's briefing is refused, and a briefing stops at 8 turns", async ({ page, browser }) => {
    await page.goto("/");
    await skipTour(page);
    const first = await (await page.request.post("/api/voice/extract", { data: { transcript: "hi, I want a job", lang: "en" } })).json();
    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.201.0.3" } });
    await other.request.post("http://localhost:3100/api/tour", { data: { event: "visit" } });
    expect((await other.request.post("http://localhost:3100/api/voice/extract", { data: { transcript: "taking over", lang: "en", briefingId: first.briefingId } })).status()).toBe(403);
    expect((await other.request.post("http://localhost:3100/api/generate", { data: { mode: "improve", targetRole: "x", resume: SAMPLE_RESUME, briefingId: first.briefingId } })).status()).toBe(403);
    await other.close();

    for (let turn = 2; turn <= 8; turn++) {
      const res = await page.request.post("/api/voice/extract", { data: { transcript: `turn number ${turn}`, lang: "en", briefingId: first.briefingId } });
      expect(res.status(), `turn ${turn}`).toBe(200);
    }
    const ninth = await page.request.post("/api/voice/extract", { data: { transcript: "one more", lang: "en", briefingId: first.briefingId } });
    expect(ninth.status()).toBe(429);
    expect((await ninth.json()).error).toBe("voice_turns_limit");
  });
});
