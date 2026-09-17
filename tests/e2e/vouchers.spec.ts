import { test, expect } from "./fixtures";
import { login, signUp, skipTour } from "./helpers";

test.describe("promo codes and referrals", () => {
  test("admin creates a code → a user redeems it on pricing → the balance grows → admin sees it; batches export unique codes", async ({ page, browser }) => {
    const admin = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.205.0.1" }, acceptDownloads: true });
    const ap = await admin.newPage();
    await login(ap, "admin@resumetailor.app", "resumetailor2026");
    await ap.goto("/admin");
    await ap.getByTestId("admin-tab-codes").click();
    const code = `USP${Date.now().toString(36).toUpperCase()}`;
    await ap.getByTestId("voucher-admin-code").fill(code);
    await ap.getByTestId("voucher-admin-credits").fill("2");
    await ap.getByTestId("voucher-admin-campaign").fill("usp-carreiras");
    await ap.getByTestId("voucher-create").click();
    await expect(ap.getByTestId("voucher-row").filter({ hasText: code })).toContainText("0/1");

    await page.goto("/signup");
    await skipTour(page);
    await signUp(page);
    await expect(page.getByTestId("credits")).toContainText("1");
    await page.goto(`/resgatar/${code.toLowerCase()}`);
    await expect(page).toHaveURL(/\/pt\/precos\?code=/);
    await expect(page.getByTestId("voucher-code")).toHaveValue(code);
    await page.getByTestId("voucher-redeem").click();
    await expect(page.getByTestId("voucher-note")).toContainText("2 créditos");
    await expect(page.getByTestId("credits")).toContainText("3");
    await page.getByTestId("voucher-code").fill(code);
    await page.getByTestId("voucher-redeem").click();
    await expect(page.getByTestId("voucher-note")).toContainText("já foi usado");

    await ap.reload();
    await ap.getByTestId("admin-tab-codes").click();
    await expect(ap.getByTestId("voucher-row").filter({ hasText: code })).toContainText("1/1");
    await expect(ap.getByTestId("redemption-table")).toContainText(code);

    await ap.getByTestId("voucher-mode-batch").click();
    await ap.getByTestId("voucher-admin-count").fill("12");
    await ap.getByTestId("voucher-admin-campaign").fill("bootcamp-x");
    await ap.getByTestId("voucher-create").click();
    const [download] = await Promise.all([ap.waitForEvent("download"), ap.getByTestId("voucher-csv").click()]);
    const fs = await import("node:fs");
    const lines = fs.readFileSync(await download.path(), "utf8").trim().split("\n");
    expect(lines[0]).toBe("code,credits,campaign,expiresAt");
    const codes = lines.slice(1).map((l) => l.split(",")[0]);
    expect(codes).toHaveLength(12);
    expect(new Set(codes).size).toBe(12);
    // Non-admins cannot list or create codes.
    expect((await page.request.get("/api/admin/vouchers")).status()).toBe(403);
    await admin.close();
  });

  test("a friend's link leaves a pending referral and the library shows the share link", async ({ page, browser }) => {
    await page.goto("/signup");
    await skipTour(page);
    await signUp(page);
    await page.goto("/library");
    const link = await page.getByTestId("referral-link").innerText();
    expect(link).toMatch(/\/r\/[A-Z2-9]{8}$/);

    const friend = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.205.0.9" }, locale: "pt-BR" });
    const fp = await friend.newPage();
    await fp.goto(new URL(link).pathname);
    await expect(fp).toHaveURL(/\/pt$/);
    await fp.goto("/signup");
    await signUp(fp);
    await fp.close();
    await friend.close();
    await page.reload();
    await expect(page.getByTestId("referral-stats")).toContainText(/^1 /);
    const me = await (await page.request.get("/api/auth/me")).json();
    expect(me.user.credits).toBe(1);   // nothing for a signup alone
  });
});
