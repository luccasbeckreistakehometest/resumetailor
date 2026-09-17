import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// A fresh database per run, separate from the other suites.
const DIR = path.join(process.cwd(), "data", "unit-launch");
process.env.DATA_DIR = DIR;
fs.rmSync(DIR, { recursive: true, force: true });

const { env, secretEnv, supportContacts, envNumber, baseUrl } = await import("@/lib/server/env");
const { hit, peek, take, clearLimit, rule } = await import("@/lib/server/ratelimit");
const users = await import("@/lib/server/users");
const { signSession, verifySession, oneTimePassword, safeEqual, authSecret } = await import("@/lib/server/auth");
const { isDisposableEmail } = await import("@/lib/server/disposable");
const { settlePayment, reversePayment, mpAction, applyMpAction, getPayment } = await import("@/lib/server/payments");
const { checkoutOptions, priceLabel, currencyOf } = await import("@/lib/checkout");
const { PACKS } = await import("@/lib/packs");
const { createTranscript } = await import("@/lib/client/transcript");
const { getDb } = await import("@/lib/server/db");
const { exportAccount, deleteAccount } = await import("@/lib/server/account");
const { saveGeneration } = await import("@/lib/server/generations");
const { mockKit } = await import("@/lib/ai/kit");
const { contactSchema, saveContact, listContacts, setContactStatus } = await import("@/lib/server/contact");
const { API_ERRORS } = await import("@/lib/errors");
const { launch, apiErrorText } = await import("@/app/i18n/launch");

let n = 0;
const email = () => `l${++n}-${Date.now()}@example.com`;
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined) => { if (!(k in saved)) saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; };
afterEach(() => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; delete saved[k]; } });

describe("env parsing", () => {
  it("treats docker's inline comments and example placeholders as unset", () => {
    setEnv("X_TEST", "# preferred: elevenlabs.io → multilingual");
    expect(env("X_TEST")).toBeUndefined();
    setEnv("X_TEST", "   ");
    expect(env("X_TEST")).toBeUndefined();
    setEnv("X_TEST", " real-value ");
    expect(env("X_TEST")).toBe("real-value");
    setEnv("X_KEY", "sk_live_...");
    expect(secretEnv("X_KEY")).toBeUndefined();
    setEnv("X_KEY", "sk-ant-api03-abcdef");
    expect(secretEnv("X_KEY")).toBe("sk-ant-api03-abcdef");
    setEnv("X_NUM", "# comment");
    expect(envNumber("X_NUM", 7)).toBe(7);
    setEnv("X_NUM", "12");
    expect(envNumber("X_NUM", 7)).toBe(12);
  });

  it("hides the placeholder WhatsApp number and shows only configured channels", () => {
    setEnv("SUPPORT_EMAIL", undefined); setEnv("NEXT_PUBLIC_SUPPORT_EMAIL", undefined);
    setEnv("SUPPORT_WHATSAPP", undefined); setEnv("NEXT_PUBLIC_SUPPORT_WHATSAPP", "5511999999999");
    expect(supportContacts()).toEqual({ email: null, whatsapp: null });
    setEnv("SUPPORT_WHATSAPP", "+55 (21) 98888-7777");
    setEnv("SUPPORT_EMAIL", "help@example.com");
    expect(supportContacts()).toEqual({ email: "help@example.com", whatsapp: "5521988887777" });
  });

  it("cookies are Secure in production except on plain-http localhost, and test fixtures need an explicit flag", async () => {
    const { secureCookies, testFixturesAllowed } = await import("@/lib/server/env");
    setEnv("NODE_ENV", "production"); setEnv("E2E_TEST_MODE", undefined);
    setEnv("NEXT_PUBLIC_BASE_URL", "https://resumetailor.marqa.online");
    expect(secureCookies()).toBe(true);
    expect(testFixturesAllowed()).toBe(false);
    setEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3100");
    expect(secureCookies()).toBe(false);
    setEnv("NEXT_PUBLIC_BASE_URL", "http://example.com");
    expect(secureCookies()).toBe(true);
    setEnv("E2E_TEST_MODE", "1");
    expect(testFixturesAllowed()).toBe(true);
    setEnv("NODE_ENV", "test"); setEnv("E2E_TEST_MODE", undefined);
    expect(secureCookies()).toBe(false);
    expect(testFixturesAllowed()).toBe(true);
  });

  it("builds checkout URLs from configuration, never a trailing slash", () => {
    setEnv("NEXT_PUBLIC_BASE_URL", "https://resumetailor.example/");
    expect(baseUrl()).toBe("https://resumetailor.example");
  });
});

describe("rate limits", () => {
  it("counts per window and resets in the next one", () => {
    const now = 1_000_000_000_000;
    expect(hit("t-bucket", "k", 2, 60, now).ok).toBe(true);
    expect(hit("t-bucket", "k", 2, 60, now + 1).ok).toBe(true);
    const third = hit("t-bucket", "k", 2, 60, now + 2);
    expect(third.ok).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
    expect(hit("t-bucket", "other", 2, 60, now).ok).toBe(true);        // keys are independent
    expect(hit("t-bucket", "k", 2, 60, now + 61_000).ok).toBe(true);   // next window
  });

  it("peek reads without counting (for failure lockouts), and clear resets", () => {
    const r = rule("LOGIN_FAIL_ACCOUNT_15M");
    expect(r.max).toBe(5);
    for (let i = 0; i < 5; i++) take("LOGIN_FAIL_ACCOUNT_15M", "victim@example.com");
    expect(peek("LOGIN_FAIL_ACCOUNT_15M", "victim@example.com", r.max, r.windowSec).ok).toBe(false);
    clearLimit("LOGIN_FAIL_ACCOUNT_15M", "victim@example.com");
    expect(peek("LOGIN_FAIL_ACCOUNT_15M", "victim@example.com", r.max, r.windowSec).ok).toBe(true);
  });

  it("limits are adjustable by env", () => {
    setEnv("RL_CONTACT_IP_HOUR", "1");
    expect(rule("CONTACT_IP_HOUR").max).toBe(1);
  });
});

describe("accounts and sessions", () => {
  it("a session carries the account's version; bumping it revokes every token", async () => {
    const u = await users.createUser({ email: email(), password: "password123" });
    const token = signSession({ userId: u.id, role: u.role, sv: u.sessionVersion });
    expect(verifySession(token)?.sv).toBe(0);
    const bumped = users.bumpSessionVersion(u.id)!;
    expect(bumped.sessionVersion).toBe(1);
    expect(verifySession(token)!.sv).not.toBe(bumped.sessionVersion);   // currentUser() rejects this mismatch
  });

  it("a password change and a disable both end sessions; disabled accounts cannot sign in", async () => {
    const mail = email();
    const u = await users.createUser({ email: mail, password: "password123" });
    const changed = await users.setPassword(u.id, "another-pass-1");
    expect(changed.sessionVersion).toBe(u.sessionVersion + 1);
    expect(await users.authenticate(mail, "password123")).toBeNull();
    expect(await users.authenticate(mail, "another-pass-1")).not.toBeNull();
    users.setDisabled(u.id, true);
    expect(await users.authenticate(mail, "another-pass-1")).toBeNull();
    expect(users.findById(u.id)!.sessionVersion).toBe(changed.sessionVersion + 1);
    users.setDisabled(u.id, false);
    expect(await users.authenticate(mail, "another-pass-1")).not.toBeNull();
  });

  it("an admin reset sets a one-time password that must be changed", async () => {
    const u = await users.createUser({ email: email(), password: "password123" });
    const temp = oneTimePassword();
    expect(temp).toMatch(/^[A-Za-z2-9]{14}$/);
    const row = await users.setPassword(u.id, temp, { mustChange: true });
    expect(users.toPublic(row).mustChangePassword).toBe(true);
    expect(users.toPublic(await users.setPassword(u.id, "chosen-by-user")).mustChangePassword).toBe(false);
  });

  it("ensureAdmin creates the admin, keeps an in-app password change, and re-syncs when ADMIN_PASSWORD changes", async () => {
    const adminMail = `root-${Date.now()}@example.com`;
    setEnv("ADMIN_EMAIL", adminMail); setEnv("ADMIN_PASSWORD", "first-admin-pass");
    users.__resetAdminCheck(); await users.ensureAdmin();
    expect(await users.authenticate(adminMail, "first-admin-pass")).not.toBeNull();
    const admin = users.findByEmail(adminMail)!;
    expect(admin.role).toBe("admin");
    await users.setPassword(admin.id, "changed-in-the-app");
    users.__resetAdminCheck(); await users.ensureAdmin();              // restart, same env: the app change stays
    expect(await users.authenticate(adminMail, "changed-in-the-app")).not.toBeNull();
    setEnv("ADMIN_PASSWORD", "rotated-admin-pass");
    users.__resetAdminCheck(); await users.ensureAdmin();              // restart, new env value: re-synced
    expect(await users.authenticate(adminMail, "rotated-admin-pass")).not.toBeNull();
    expect(await users.authenticate(adminMail, "changed-in-the-app")).toBeNull();
    expect(users.findByEmail(adminMail)!.sessionVersion).toBeGreaterThan(admin.sessionVersion);
  });

  it("the free signup credit is capped per IP per 30 days, and consent is stored with a time", async () => {
    setEnv("SIGNUP_BONUS_PER_IP_30D", "2");
    const ip = `203.0.113.${Date.now() % 250}`;
    const a = await users.createUser({ email: email(), password: "password123", ip, termsAccepted: true });
    const b = await users.createUser({ email: email(), password: "password123", ip, termsAccepted: true });
    const c = await users.createUser({ email: email(), password: "password123", ip, termsAccepted: true });
    expect([a.credits, b.credits, c.credits]).toEqual([1, 1, 0]);
    expect(c.termsAcceptedAt).toBeTruthy();
    expect(c.termsVersion).toBe(users.TERMS_VERSION);
    const other = await users.createUser({ email: email(), password: "password123", ip: "198.51.100.7" });
    expect(other.credits).toBe(1);
  });

  it("refuses throwaway inboxes, subdomains included", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@inbox.mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@YOPMAIL.com")).toBe(true);
    expect(isDisposableEmail("maria@gmail.com")).toBe(false);
    expect(isDisposableEmail("maria@empresa.com.br")).toBe(false);
  });

  it("compares secrets in constant time and refuses weak production secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    setEnv("NODE_ENV", "production");
    setEnv("AUTH_SECRET", "change-me-to-a-long-random-string");
    expect(() => authSecret()).toThrow(/weak/);
    setEnv("AUTH_SECRET", "");
    expect(() => authSecret()).toThrow(/missing/);
    setEnv("AUTH_SECRET", "a".repeat(64));
    expect(authSecret()).toHaveLength(64);
  });
});

describe("payments: refunds and Mercado Pago mapping", () => {
  it("a full refund takes the pack's credits back, once", async () => {
    const u = await users.createUser({ email: email(), password: "password123" });
    settlePayment({ provider: "mercadopago", externalId: "mp-r1", userId: u.id, pack: "5", credits: 5, amount: 149, currency: "BRL", status: "approved" });
    expect(users.findById(u.id)!.credits).toBe(6);
    expect(reversePayment({ provider: "mercadopago", externalId: "mp-r1", status: "refunded" }).taken).toBe(5);
    expect(reversePayment({ provider: "mercadopago", externalId: "mp-r1", status: "refunded" }).taken).toBe(0);
    expect(users.findById(u.id)!.credits).toBe(1);
    expect(getPayment("mercadopago", "mp-r1")!.status).toBe("refunded");
    // A late "approved" replay cannot grant it again.
    expect(settlePayment({ provider: "mercadopago", externalId: "mp-r1", userId: u.id, pack: "5", credits: 5, amount: 149, currency: "BRL", status: "approved" }).granted).toBe(false);
    expect(users.findById(u.id)!.credits).toBe(1);
  });

  it("never takes the balance below zero when the credits were already spent", async () => {
    const u = await users.createUser({ email: email(), password: "password123", bonus: false });
    settlePayment({ provider: "stripe", externalId: "cs-r2", userId: u.id, pack: "5", credits: 5, amount: 35, currency: "USD", status: "approved", providerRef: "pi_r2" });
    users.moveCredits(u.id, -4, "unlock", null);
    const res = reversePayment({ provider: "stripe", providerRef: "pi_r2", status: "charged_back" });
    expect(res).toEqual({ found: true, taken: 1 });
    expect(users.findById(u.id)!.credits).toBe(0);
  });

  it("a partial Stripe refund takes back the matching share", async () => {
    const u = await users.createUser({ email: email(), password: "password123", bonus: false });
    settlePayment({ provider: "stripe", externalId: "cs-r3", userId: u.id, pack: "15", credits: 15, amount: 75, currency: "USD", status: "approved", providerRef: "pi_r3" });
    expect(reversePayment({ provider: "stripe", providerRef: "pi_r3", status: "refunded", share: 0.4 }).taken).toBe(6);
    expect(reversePayment({ provider: "stripe", providerRef: "pi_r3", status: "refunded", share: 1 }).taken).toBe(9);
    expect(users.findById(u.id)!.credits).toBe(0);
  });

  it("maps Mercado Pago payments to ledger actions", () => {
    const meta = { user_id: "usr_1", pack: "1", credits: 1 };
    expect(mpAction({ id: 1, status: "approved", transaction_amount: 39, currency_id: "BRL", metadata: meta })).toMatchObject({ kind: "settle", status: "approved", userId: "usr_1", credits: 1 });
    expect(mpAction({ id: 2, status: "in_process", metadata: meta })).toMatchObject({ kind: "settle", status: "pending" });
    expect(mpAction({ id: 3, status: "cancelled", metadata: meta })).toMatchObject({ kind: "settle", status: "rejected" });
    expect(mpAction({ id: 4, status: "refunded", transaction_amount: 100, transaction_amount_refunded: 50 })).toEqual({ kind: "reverse", externalId: "4", status: "refunded", share: 0.5 });
    expect(mpAction({ id: 5, status: "charged_back", transaction_amount: 100 })).toMatchObject({ kind: "reverse", share: 1 });
    expect(mpAction({ id: 6, status: "approved", metadata: {} })).toMatchObject({ kind: "ignore" });
    expect(applyMpAction({ kind: "ignore", reason: "x" })).toEqual({ granted: false, reversed: 0 });
  });

  it("offers checkouts by what is configured, and labels BRL for non-Brazilians", () => {
    expect(checkoutOptions({ stripe: false, mercadopago: true }, "en")).toEqual(["mercadopago"]);
    expect(checkoutOptions({ stripe: true, mercadopago: true }, "pt")).toEqual(["mercadopago", "stripe"]);
    expect(checkoutOptions({ stripe: true, mercadopago: true }, "es")).toEqual(["stripe", "mercadopago"]);
    expect(checkoutOptions({ stripe: false, mercadopago: false }, "pt")).toEqual([]);
    expect(currencyOf("mercadopago", "en")).toBe("BRL");
    expect(currencyOf(null, "en")).toBe("USD");
    expect(priceLabel(PACKS[0], "BRL", "en")).toBe("R$ 39 (BRL)");
    expect(priceLabel(PACKS[0], "BRL", "pt")).toBe("R$ 39");
    expect(priceLabel(PACKS[0], "USD", "en")).toBe("$9");
    expect(priceLabel(PACKS[0], "USD", "es")).toBe("US$ 9");
  });
});

describe("voice transcript", () => {
  it("keeps the words said before Chrome's automatic stop", () => {
    const t = createTranscript();
    t.result("I studied marketing", " and then");
    t.restart();                                   // Chrome ended after a pause; the results list starts over
    t.result("I worked at an agency", "");
    expect(t.text()).toBe("I studied marketing and then I worked at an agency");
    t.set("fed by a test");
    expect(t.text()).toBe("fed by a test");
    t.reset();
    expect(t.text()).toBe("");
  });
});

describe("LGPD: export and delete", () => {
  it("exports the account's data and deletes it, keeping payments without the person", async () => {
    const u = await users.createUser({ email: email(), password: "password123" });
    const kit = mockKit({ mode: "build", targetRole: "Analyst", lang: "en", profile: "x" });
    const g = saveGeneration({ userId: u.id, anonId: null, mode: "build", source: "text", lang: "en", targetRole: "Analyst", input: { profile: "secret profile" }, kit, model: "mock", costUsd: 0 });
    settlePayment({ provider: "mercadopago", externalId: "mp-del", userId: u.id, pack: "1", credits: 1, amount: 39, currency: "BRL", status: "approved" });
    const db = getDb();
    db.prepare("INSERT INTO voice_briefings (id,ownerId,lang,transcript,extracted,createdAt) VALUES (?,?,?,?,?,?)").run(`vb-${u.id}`, u.id, "en", "my story", "{}", new Date().toISOString());
    saveContact({ name: "", email: u.email, topic: "privacy", message: "please export my data", lang: "en", userId: u.id, ip: "1.2.3.4" });

    const data = exportAccount(u.id)!;
    expect(data.account.email).toBe(u.email);
    expect(JSON.stringify(data)).not.toContain(u.passwordHash);
    expect(data.kits).toHaveLength(1);
    expect(data.payments).toHaveLength(1);
    expect(data.voiceBriefings).toHaveLength(1);

    expect(deleteAccount(u.id)).toBe(true);
    expect(users.findById(u.id)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) n FROM generations WHERE id = ?").get(g.id)).toEqual({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) n FROM voice_briefings WHERE ownerId = ?").get(u.id)).toEqual({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) n FROM credit_ledger WHERE userId = ?").get(u.id)).toEqual({ n: 0 });
    const pay = getPayment("mercadopago", "mp-del")!;
    expect(pay.userId).toBeNull();
    expect(pay.amount).toBe(39);
  });
});

describe("contact messages", () => {
  it("validates, stores and moves through statuses", () => {
    expect(contactSchema.safeParse({ email: "bad", message: "hello there!" }).success).toBe(false);
    expect(contactSchema.safeParse({ email: "a@b.co", message: "short" }).success).toBe(false);
    const ok = contactSchema.parse({ email: "Visitor@Example.com", message: "My Pix did not show up.", topic: "payment", lang: "pt" });
    const row = saveContact({ ...ok, userId: null, ip: "1.1.1.1" });
    expect(row.email).toBe("visitor@example.com");
    expect(row.status).toBe("new");
    expect(setContactStatus(row.id, "done")!.status).toBe("done");
    expect(listContacts("done").some((m) => m.id === row.id)).toBe(true);
  });
});

describe("error codes", () => {
  it("every API error code has copy in all three languages", () => {
    for (const lang of ["en", "pt", "es"] as const) {
      for (const code of API_ERRORS) expect(launch[lang].apiErrors[code], `${lang}:${code}`).toBeTruthy();
    }
    expect(apiErrorText({ error: "wrong_credentials" }, launch.pt, "x")).toBe("E-mail ou senha incorretos.");
    expect(apiErrorText({ error: "Some English sentence" }, launch.pt, "fallback")).toBe("fallback");
  });
});

