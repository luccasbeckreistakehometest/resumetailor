import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./fixtures";
import { signUp, skipTour } from "./helpers";

// The e2e server has Mercado Pago "configured" (fake token, payments read from MP_API_MOCK_DIR) and Stripe off.
const MP_DIR = path.join(process.cwd(), "data", "e2e", "mp");
function mockPayment(id: string, payment: Record<string, unknown>) {
  fs.mkdirSync(MP_DIR, { recursive: true });
  fs.writeFileSync(path.join(MP_DIR, `${id}.json`), JSON.stringify({ id, ...payment }));
}

test("with Stripe off, English visitors pay through Mercado Pago in labelled BRL — no dead buttons, no Stripe claim", async ({ page }) => {
  await page.goto("/pricing");
  await skipTour(page);
  await page.goto("/pricing");
  for (const k of ["1", "5", "15"]) await expect(page.getByTestId(`pack-${k}`)).toBeVisible();
  await expect(page.getByTestId("price-1")).toHaveText("R$ 39 (BRL)");
  await expect(page.getByTestId("brl-note")).toContainText(/Brazilian reais/);
  await expect(page.getByTestId("buy-1")).toBeEnabled();
  await expect(page.getByTestId("provider-choice")).toHaveCount(0);
  await expect(page.getByText(/not configured/i)).toHaveCount(0);
  await expect(page.getByTestId("footer-payments")).toContainText(/Mercado Pago/);
  await expect(page.getByTestId("footer-payments")).not.toContainText(/Stripe/);
  await expect(page.getByText(/company insights/i)).toHaveCount(0);   // Tavily is off on this server
  await page.getByRole("button", { name: "PT" }).first().click();
  await expect(page.getByTestId("price-1")).toHaveText("R$ 39");
  await page.getByRole("button", { name: "ES" }).first().click();
  await expect(page.getByTestId("price-1")).toHaveText("R$ 39 (BRL)");
  await expect(page.getByTestId("brl-note")).toContainText(/reales brasileños/);
  // Buying needs an account: the dialog opens in sign-in mode (it is not a signup CTA).
  await page.getByTestId("buy-1").click();
  await expect(page.getByTestId("auth-modal")).toHaveAttribute("data-mode", "in");
});

test("a canceled checkout says nothing was charged", async ({ page }) => {
  await page.goto("/pricing?canceled=1");
  await skipTour(page);
  await expect(page.getByTestId("checkout-canceled")).toContainText(/nothing was charged/i);
});

test("Mercado Pago: success page waits for the payment, credits land once, refunds take them back", async ({ page, request }) => {
  await page.goto("/pricing");
  await skipTour(page);
  await page.getByTestId("buy-5").click();
  const user = await signUp(page);
  // After signup the purchase continues; the mock checkout returns straight to /success.
  await expect(page).toHaveURL(/\/success\?provider=mp/, { timeout: 15_000 });
  const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
  const userId = me.user.id as string;
  expect(me.user.credits).toBe(1);

  // A pending Pix: the page must not say "paid".
  const payId = `e2e${Date.now()}`;
  mockPayment(payId, { status: "pending", transaction_amount: 149, currency_id: "BRL", metadata: { user_id: userId, pack: "5", credits: 5 } });
  await page.goto(`/success?provider=mp&payment_id=${payId}&status=approved`);   // the URL's own status is never trusted
  await expect(page.getByTestId("success")).toHaveAttribute("data-status", "pending", { timeout: 15_000 });

  // The webhook reports approval; the page then shows the credits.
  mockPayment(payId, { status: "approved", transaction_amount: 149, currency_id: "BRL", metadata: { user_id: userId, pack: "5", credits: 5 } });
  const hook = await request.post("/api/webhooks/mercadopago", { data: { type: "payment", data: { id: payId } } });
  expect(hook.status()).toBe(200);
  // A replayed notification grants nothing more.
  await request.post("/api/webhooks/mercadopago", { data: { type: "payment", data: { id: payId } } });
  await page.getByRole("button", { name: /check again/i }).click();
  await expect(page.getByTestId("success")).toHaveAttribute("data-status", "paid", { timeout: 15_000 });
  await expect(page.getByTestId("success-credits")).toContainText("6 credits");

  // Unknown payment ids are not retried; a lookup the server cannot answer asks MP to retry.
  expect((await request.post("/api/webhooks/mercadopago", { data: { type: "payment", data: { id: "does-not-exist" } } })).status()).toBe(200);

  // A refund removes the credits of that payment.
  mockPayment(payId, { status: "refunded", transaction_amount: 149, transaction_amount_refunded: 149, currency_id: "BRL", metadata: { user_id: userId, pack: "5", credits: 5 } });
  await request.post("/api/webhooks/mercadopago", { data: { type: "payment", data: { id: payId } } });
  const after = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
  expect(after.user.credits).toBe(1);
  await page.goto("/account");
  await expect(page.getByTestId("account-plan")).toContainText("1 left");
  await expect(page.getByTestId("account")).toContainText(/Refunded/);
  expect(user.email).toContain("@");
});

test("someone else's payment id is refused on the success check", async ({ page }) => {
  await page.goto("/");
  await skipTour(page);
  await page.getByTestId("open-auth").click();
  await signUp(page);
  const payId = `e2e-other-${Date.now()}`;
  mockPayment(payId, { status: "approved", transaction_amount: 39, currency_id: "BRL", metadata: { user_id: "usr_somebody_else", pack: "1", credits: 1 } });
  const res = await page.evaluate((id) => fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "mp", paymentId: id }) }).then((r) => r.status), payId);
  expect(res).toBe(404);
  const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
  expect(me.user.credits).toBe(1);
});
