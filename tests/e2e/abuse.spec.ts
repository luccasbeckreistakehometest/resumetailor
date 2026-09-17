import { test, expect } from "./fixtures";
import { BUILD_PROFILE, buildKitByText, signUp, skipTour } from "./helpers";

const kitBody = (role = "Marketing Analyst") => ({ mode: "build", targetRole: role, lang: "en", profile: `${BUILD_PROFILE.edu}\n${BUILD_PROFILE.skills}` });

test.describe("abuse and cost limits", () => {
  test("anonymous previews are capped per IP per day; an account keeps working", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await page.request.post("/api/generate", { data: kitBody() })).status());
    expect(statuses).toEqual([200, 200, 200, 429]);
    const refused = await page.request.post("/api/generate", { data: kitBody() });
    expect((await refused.json()).error).toBe("account_required");
    await page.getByTestId("open-auth").click();
    await signUp(page);
    expect((await page.request.post("/api/generate", { data: kitBody() })).status()).toBe(200);
  });

  test("signups are limited per IP, and the free credit only goes to the first accounts from one address", async ({ request }) => {
    const statuses: number[] = [];
    const bonuses: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await request.post("/api/auth/register", { data: { email: `farm${Date.now()}-${i}@example.com`, password: "password123", acceptTerms: true } });
      statuses.push(r.status());
      if (r.ok()) bonuses.push((await r.json()).bonus);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(bonuses).toEqual([true, true, false, false, false]);
  });

  test("a voice briefing can only be continued by whoever started it", async ({ page, browser }) => {
    await page.goto("/");
    await skipTour(page);
    const first = await page.request.post("/api/voice/extract", { data: { transcript: "hi, I want a job", lang: "en" } });
    expect(first.status()).toBe(200);
    const { briefingId } = await first.json();
    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.203.0.4" } });
    // No visitor cookie yet (a script, not a page): refused before any AI call.
    const cold = await other.request.post("http://localhost:3100/api/voice/extract", { data: { transcript: "hi, I want a job", lang: "en" } });
    expect(cold.status()).toBe(403);
    const script = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.203.0.9" } });
    expect((await script.request.post("http://localhost:3100/api/fit", { data: { posting: "p".repeat(40), resume: "r".repeat(40), lang: "en" } })).status()).toBe(403);
    await script.close();
    await other.request.get("http://localhost:3100/api/tour");   // what every page does first
    const hijack = await other.request.post("http://localhost:3100/api/voice/extract", { data: { transcript: "overwrite someone else's story", lang: "en", briefingId } });
    expect(hijack.status()).toBe(404);
    await other.close();
    const own = await page.request.post("/api/voice/extract", { data: { transcript: "I studied marketing and want an analyst role", lang: "en", briefingId } });
    expect((await own.json()).briefingId).toBe(briefingId);
  });

  test("a GET never creates tour rows, and the text-to-speech endpoint needs a visitor cookie", async ({ request }) => {
    const fresh = await request.get("/api/tour");
    expect(await fresh.json()).toMatchObject({ tourCompleted: false, tourStep: 0, firstSeenAt: null });
    expect((await request.get("/api/tour")).ok()).toBe(true);
    const again = await request.get("/api/tour");
    expect((await again.json()).firstSeenAt).toBeNull();
    // No voice provider on this server: the endpoint says so and stays silent.
    expect(await (await request.get("/api/voice/speak")).json()).toEqual({ provider: null });
    expect((await request.post("/api/voice/speak", { data: { text: "anything at all", lang: "en" } })).status()).toBe(204);
  });

  test("a protected web résumé locks after repeated wrong PINs, even for the right one", async ({ page, browser }) => {
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("publish-toggle").check();
    await expect(page.getByTestId("publish-url")).toHaveValue(/\/cv\/[a-z0-9-]+$/);
    await page.getByTestId("publish-pin").fill("2468");
    await page.getByTestId("publish-pin-save").click();
    await expect(page.getByTestId("publish-has-pin")).toBeVisible();
    const slug = (await page.getByTestId("publish-url").inputValue()).split("/cv/")[1];

    const guesser = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.204.0.5" } });
    const codes: number[] = [];
    for (const pin of ["0000", "1111", "2222", "3333", "4444"]) codes.push((await guesser.request.post(`http://localhost:3100/api/cv/${slug}/pin`, { data: { pin } })).status());
    expect(codes).toEqual([403, 403, 403, 403, 403]);
    const right = await guesser.request.post(`http://localhost:3100/api/cv/${slug}/pin`, { data: { pin: "2468" } });
    expect(right.status()).toBe(429);
    const p = await guesser.newPage();
    await p.goto(`http://localhost:3100/cv/${slug}`);
    await p.getByTestId("cv-pin-input").fill("2468");
    await p.getByTestId("cv-pin-submit").click();
    await expect(p.getByTestId("cv-pin-wrong")).toContainText(/Too many wrong tries/);
    await guesser.close();
    // A parallel burst from one address gets no more wrong PINs checked than the limit.
    const burster = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.206.0.7" } });
    const burst = await Promise.all(Array.from({ length: 30 }, (_, i) =>
      burster.request.post(`http://localhost:3100/api/cv/${slug}/pin`, { data: { pin: String(1000 + i) } }).then((r) => r.status())));
    expect(burst.filter((c) => c === 403).length).toBeLessThanOrEqual(5);
    expect(burst.filter((c) => c === 429).length).toBeGreaterThanOrEqual(25);
    await burster.close();
    // Someone else, from another address, is not locked out.
    const friend = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.205.0.6" } });
    expect((await friend.request.post(`http://localhost:3100/api/cv/${slug}/pin`, { data: { pin: "2468" } })).status()).toBe(200);
    await friend.close();
  });

  test("a parallel burst of logins gets no more passwords checked than the lockout allows", async ({ request }) => {
    const mail = `burst${Date.now()}@example.com`;
    expect((await request.post("/api/auth/register", { data: { email: mail, password: "password123", acceptTerms: true } })).ok()).toBe(true);
    const codes = await Promise.all(Array.from({ length: 30 }, (_, i) =>
      request.post("/api/auth/login", { data: { email: mail, password: `wrong-${i}` } }).then((r) => r.status())));
    expect(codes.filter((c) => c === 401).length).toBeLessThanOrEqual(5);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(25);
    // Locked: even the right password is refused until the window passes.
    expect((await request.post("/api/auth/login", { data: { email: mail, password: "password123" } })).status()).toBe(429);
  });

  test("when the AI fails, visitors get a neutral localized message and /start admits it until it recovers", async ({ page }) => {
    await page.goto("/start");
    await skipTour(page);
    await page.getByRole("button", { name: "PT" }).click();
    await page.goto("/start");
    await expect(page.getByTestId("ai-down")).toHaveCount(0);
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-build").click();
    await page.getByTestId("role").fill("Analista [[mock-ai-down]]");
    await page.getByTestId("next").click();
    await page.getByTestId("build-edu").fill(BUILD_PROFILE.edu);
    await page.getByTestId("build-skills").fill(BUILD_PROFILE.skills);
    await page.getByTestId("next").click();
    const alert = page.getByRole("alert").filter({ hasText: /gerar/ });
    await expect(alert).toHaveText("Não dá pra gerar agora. Seu texto continua aqui — tenta de novo em alguns minutos.");
    await expect(page.locator("body")).not.toContainText(/ANTHROPIC|API key/i);
    await page.goto("/start");
    await expect(page.getByTestId("ai-down")).toContainText(/fora do ar/);
    // The server also refuses new AI work right away instead of letting people fill everything in first.
    const blocked = await page.request.post("/api/generate", { data: kitBody("Analyst") });
    expect(blocked.status()).toBe(503);
    expect((await blocked.json()).error).toBe("ai_unavailable");
    // AI_PROBE_RETRY_SECONDS=8 on the e2e server: it heals like a successful re-probe would.
    await page.waitForTimeout(8500);
    await page.goto("/start");
    await expect(page.getByTestId("via-text")).toBeVisible();
    await expect(page.getByTestId("ai-down")).toHaveCount(0);
  });
});
