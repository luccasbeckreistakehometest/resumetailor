import { test, expect } from "./fixtures";
import { BUILD_PROFILE, login, signUp, skipTour } from "./helpers";

test.describe("first-party analytics", () => {
  test("an ad visit → preview → signup → unlock shows up as one campaign row in Acquisition", async ({ page, browser }) => {
    const campaign = `br_firstjob_${Date.now()}`;
    await page.goto(`/pt/lp/primeiro-emprego?utm_source=meta&utm_medium=paid&utm_campaign=${campaign}`);
    await skipTour(page);
    await page.goto("/start?lang=pt");
    await page.getByTestId("via-text").click();
    await page.getByTestId("mode-build").click();
    await page.getByTestId("role").fill("Analista de Marketing");
    await page.getByTestId("next").click();
    await page.getByTestId("build-edu").fill(BUILD_PROFILE.edu);
    await page.getByTestId("build-skills").fill(BUILD_PROFILE.skills);
    await page.getByTestId("next").click();
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("unlock").click();
    await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

    const admin = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.202.0.7" } });
    const ap = await admin.newPage();
    await login(ap, "admin@resumetailor.app", "resumetailor2026");
    await ap.goto("/admin");
    await ap.getByTestId("admin-tab-acquisition").click();
    const row = ap.getByTestId("acq-sources-row").filter({ hasText: campaign });
    await expect(row).toHaveCount(1);
    // source, medium, campaign, visitors, preview, signup, unlock, purchase, …
    await expect(row.locator("td")).toHaveText(["meta", "paid", campaign, "1", "1", "1", "1", "0", "—", "0%"]);
    await expect(ap.getByTestId("acq-landing-row").filter({ hasText: "/pt/lp/primeiro-emprego" }).first()).toBeVisible();
    await expect(ap.getByTestId("utm-builder")).toBeVisible();
    await ap.getByTestId("utm-campaign").fill("br gupy");
    await expect(ap.getByTestId("utm-url")).toContainText("utm_campaign=br_gupy");
    await admin.close();
  });

  test("the collector refuses unknown and server-only names, ignores crawlers and cookieless calls, and the pages load no third-party script", async ({ page, request, browser }) => {
    // No page of ours was loaded, so no visitor cookie: accepted, stored nowhere.
    const bare = await browser.newContext();
    expect((await bare.request.post("http://localhost:3100/api/e", { data: { name: "page_view", path: "/probe-nocookie" } })).status()).toBe(204);
    await bare.close();
    // A browser that sends Global Privacy Control is never counted, even with a cookie.
    const gpc = await browser.newContext({ extraHTTPHeaders: { "sec-gpc": "1" } });
    await gpc.request.get("http://localhost:3100/pricing");
    expect((await gpc.request.post("http://localhost:3100/api/e", { data: { name: "page_view", path: "/probe-gpc" } })).status()).toBe(204);
    await gpc.close();
    await page.goto("/");
    await skipTour(page);
    expect((await page.request.post("/api/e", { data: { name: "hack" } })).status()).toBe(400);
    // Conversions are recorded by the server only: a browser cannot post a purchase or a signup.
    for (const name of ["purchase", "signup", "unlock", "preview_ready"]) {
      expect((await page.request.post("/api/e", { data: { name, path: "/probe-fake-purchase" } })).status(), name).toBe(400);
    }
    expect((await page.request.post("/api/e", { data: { name: "cta_click", path: "/probe-valid", props: { angle: "x" } } })).status()).toBe(204);

    const bot = await browser.newContext({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
    await bot.request.get("http://localhost:3100/api/tour");
    expect((await bot.request.post("http://localhost:3100/api/e", { data: { name: "page_view", path: "/probe-googlebot" } })).status()).toBe(204);
    await bot.close();

    const report = await (await request.get("/api/admin/acquisition?days=7")).json();
    expect(report.error).toBe("forbidden");                       // not an admin
    const admin = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.202.0.8" } });
    const ap = await admin.newPage();
    await login(ap, "admin@resumetailor.app", "resumetailor2026");
    const full = await (await ap.request.get("/api/admin/acquisition?days=7")).json();
    const landings = full.byLanding.map((r: { landing: string }) => r.landing);
    expect(landings).not.toContain("/probe-googlebot");
    expect(landings).not.toContain("/probe-nocookie");
    expect(landings).not.toContain("/probe-gpc");
    await admin.close();

    for (const path of ["/", "/pt", "/pt/precos", "/start"]) {
      const html = await (await request.get(path)).text();
      const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
      expect(srcs.length, path).toBeGreaterThan(0);
      for (const src of srcs) expect(src, path).toMatch(/^\/_next\//);
    }
  });
});
