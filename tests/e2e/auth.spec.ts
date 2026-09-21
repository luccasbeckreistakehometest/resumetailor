import { test, expect } from "./fixtures";
import { signOut, signUp, skipTour } from "./helpers";

test.describe("sign in and sign up", () => {
  test("'Sign in' and /login open sign-in; /signup and unlock open signup; Escape closes; focus stays inside", async ({ page }) => {
    await page.goto("/");
    await skipTour(page);
    await page.getByTestId("open-auth").click();
    const modal = page.getByTestId("auth-modal");
    await expect(modal).toHaveAttribute("data-mode", "in");
    await expect(page.getByRole("dialog", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    // Tab never leaves the dialog.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("[data-testid=auth-modal]"))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(page.getByTestId("open-auth")).toBeFocused();

    await page.goto("/login");
    await expect(page.getByTestId("auth-modal")).toHaveAttribute("data-mode", "in");
    await page.goto("/signup");
    await expect(page.getByTestId("auth-modal")).toHaveAttribute("data-mode", "up");
    await expect(page.getByTestId("auth-consent")).toContainText(/Terms of Use/);
    await expect(page.getByTestId("auth-consent").getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
  });

  test("signup needs consent and a permanent email; the account shows when consent was given", async ({ page }) => {
    await page.goto("/signup");
    await skipTour(page);
    await page.getByTestId("auth-email").fill(`c${Date.now()}@example.com`);
    await page.getByTestId("auth-password").fill("password123");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("auth-error")).toContainText(/accept the Terms/i);
    // The API refuses it too, whatever the page does.
    const api = await page.request.post("/api/auth/register", { data: { email: `d${Date.now()}@example.com`, password: "password123" } });
    expect(api.status()).toBe(400);
    expect((await api.json()).error).toBe("terms_required");

    await page.getByTestId("auth-email").fill("someone@mailinator.com");
    await page.getByTestId("auth-accept").check();
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("auth-error")).toContainText(/permanent email/i);

    const email = `ok${Date.now()}@example.com`;
    await page.getByTestId("auth-email").fill(email);
    await page.getByTestId("auth-submit").click();
    await expect(page).toHaveURL(/\/start/);
    await page.goto("/account");
    await expect(page.getByTestId("account-email")).toHaveText(email);
    await expect(page.getByTestId("account")).toContainText(/Terms accepted on/);
  });

  test("wrong passwords lock the account for a while, and errors come in the visitor's language", async ({ page, request }) => {
    const email = `lock${Date.now()}@example.com`;
    await page.goto("/signup");
    await skipTour(page);
    await signUp(page, email, "password123");
    await signOut(page);

    await page.getByRole("button", { name: "PT" }).click();
    await page.goto("/login");
    await page.getByTestId("auth-email").fill(email);
    await page.getByTestId("auth-password").fill("wrong-password");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("auth-error")).toHaveText("E-mail ou senha incorretos.");

    for (let i = 0; i < 4; i++) {
      const r = await request.post("/api/auth/login", { data: { email, password: `nope-${i}` } });
      expect(r.status()).toBe(401);
    }
    // Five failures: even the right password is refused until the window passes.
    const locked = await request.post("/api/auth/login", { data: { email, password: "password123" } });
    expect(locked.status()).toBe(429);
    expect((await locked.json()).error).toBe("account_locked");
    expect(locked.headers()["retry-after"]).toBeTruthy();
    await page.getByTestId("auth-password").fill("password123");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("auth-error")).toContainText(/Muitas tentativas erradas/);
  });

  test("the forgot-password hint leads to the contact form", async ({ page }) => {
    await page.goto("/login");
    await skipTour(page);
    await page.getByTestId("auth-forgot").click();
    await page.getByRole("link", { name: /Contact/ }).click();
    await expect(page).toHaveURL(/\/contact\?topic=password/);
    await expect(page.getByTestId("contact-topic")).toHaveValue("password");
  });
});
