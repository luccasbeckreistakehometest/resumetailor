import fs from "node:fs";
import { test, expect } from "./fixtures";
import { buildKitByText, login, signUp, skipTour } from "./helpers";

test.describe("account", () => {
  test("change password signs out the other devices; sign out everywhere ends this one too", async ({ page, browser }) => {
    const email = `acc${Date.now()}@example.com`;
    await page.goto("/signup");
    await skipTour(page);
    await signUp(page, email, "password123");

    // A second device signed in with the same account.
    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.200.0.2" } });
    const phone = await other.newPage();
    await login(phone, email, "password123");
    await expect(phone).toHaveURL(/\/start/);
    expect((await phone.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user?.email).toBe(email);

    await page.goto("/account");
    await expect(page.getByTestId("account-plan")).toContainText(/No subscription and no automatic renewal/);
    await page.getByTestId("pw-current").fill("wrong-one");
    await page.getByTestId("pw-next").fill("new-password-1");
    await page.getByTestId("pw-save").click();
    await expect(page.getByTestId("account-msg-pw")).toContainText(/current password isn't right/i);
    await page.getByTestId("pw-current").fill("password123");
    await page.getByTestId("pw-next").fill("new-password-1");
    await page.getByTestId("pw-save").click();
    await expect(page.getByTestId("account-msg-pw")).toContainText(/Password changed/);

    // This device keeps its session; the other one is out.
    expect((await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user?.email).toBe(email);
    expect((await phone.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user).toBeNull();

    // The old password no longer works, the new one does.
    await login(phone, email, "password123");
    await expect(phone.getByTestId("auth-error")).toBeVisible();
    await login(phone, email, "new-password-1");
    await expect(phone).toHaveURL(/\/start/);

    await page.getByTestId("signout-all").click();
    await expect(page).toHaveURL(/\/$/);
    expect((await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user).toBeNull();
    expect((await phone.evaluate(() => fetch("/api/auth/me").then((r) => r.json()))).user).toBeNull();
    await other.close();
  });

  test("download my data, then delete my account (payments stay, the person goes)", async ({ page }) => {
    await buildKitByText(page);
    await page.getByTestId("unlock").click();
    const { email, password } = await signUp(page);
    await expect(page.getByTestId("kit")).toBeVisible({ timeout: 15_000 });

    await page.goto("/account");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()]);
    const file = await download.path();
    const data = JSON.parse(fs.readFileSync(file!, "utf8"));
    expect(data.account.email).toBe(email);
    expect(data.kits).toHaveLength(1);
    expect(data.creditLedger.map((e: { reason: string }) => e.reason)).toEqual(["signup_bonus", "unlock"]);
    expect(JSON.stringify(data)).not.toMatch(/passwordHash/);

    await page.getByTestId("delete-open").click();
    await page.getByTestId("delete-confirm").fill("not-my-email@example.com");
    await expect(page.getByTestId("delete-go")).toBeDisabled();
    await page.getByTestId("delete-confirm").fill(email);
    await page.getByTestId("delete-password").fill("wrong-password");
    await page.getByTestId("delete-go").click();
    await expect(page.getByTestId("account-msg-del")).toContainText(/current password isn't right/i);
    await page.getByTestId("delete-password").fill(password);
    await page.getByTestId("delete-go").click();
    await expect(page.getByTestId("account-deleted")).toBeVisible();

    await login(page, email, password);
    await expect(page.getByTestId("auth-error")).toContainText(/Wrong email or password/);
    const library = await page.evaluate(() => fetch("/api/generations").then((r) => r.json()));
    expect(library.items).toHaveLength(0);
  });

  test("the account page asks a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/account");
    await skipTour(page);
    await expect(page.getByText(/Sign in to see your account/)).toBeVisible();
    expect((await page.request.get("/api/account")).status()).toBe(401);
    expect((await page.request.post("/api/account/export")).status()).toBe(401);
    expect((await page.request.post("/api/account/delete", { data: { password: "x", confirm: "x" } })).status()).toBe(401);
  });
});
