import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "unit-analytics");
process.env.DATA_DIR = DIR;
process.env.ANALYTICS_EVENTS_PER_VISITOR_DAY = "8";
process.env.RL_ANALYTICS_IP_HOUR = "12";
process.env.RL_ANALYTICS_NEW_VISITOR_IP_DAY = "3";
fs.rmSync(DIR, { recursive: true, force: true });

const { parseUtm, isBot, cleanProps, refHost, isEventName, isClientEventName } = await import("@/lib/analytics/events");
const { recordAnalytics, acquisitionReport, purgeOld, linkVisitor, admitBeacon } = await import("@/lib/server/analytics");
const { getDb } = await import("@/lib/server/db");
const { createUser } = await import("@/lib/server/users");
const { settlePayment } = await import("@/lib/server/payments");

describe("analytics helpers", () => {
  it("parses UTM tags: lower-case, empty, clipped to 100, click ids as a source hint", () => {
    expect(parseUtm("?utm_source=Meta&utm_medium=Paid&utm_campaign=BR FirstJob")).toMatchObject({ source: "meta", medium: "paid", campaign: "br_firstjob" });
    expect(parseUtm("")).toEqual({ source: "", medium: "", campaign: "", content: "", term: "" });
    expect(parseUtm(`utm_campaign=${"x".repeat(300)}`).campaign).toHaveLength(100);
    expect(parseUtm("?gclid=abc").source).toBe("google");
    expect(parseUtm("?fbclid=abc&utm_source=newsletter").source).toBe("newsletter");
  });
  it("drops crawlers and keeps props small and flat", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 (Macintosh) Chrome/140 Safari/537.36")).toBe(false);
    expect(isBot("Mozilla/5.0 HeadlessChrome/140")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/140", true)).toBe(false);
    expect(isBot("")).toBe(true);
    expect(cleanProps({ a: "x", b: 2, c: { nested: 1 } })).toEqual({ a: "x", b: 2 });
    expect(refHost("https://www.google.com/search?q=cv", "resumetailor.test")).toBe("google.com");
    expect(refHost("https://resumetailor.test/pricing", "resumetailor.test")).toBe("");
    expect(isEventName("hack")).toBe(false);
  });
  it("lets the browser report only what happens in the browser; conversions are server-only", () => {
    for (const n of ["page_view", "cta_click", "lang_switch", "ats_check_run", "compare_run"]) expect(isClientEventName(n), n).toBe(true);
    for (const n of ["purchase", "signup", "unlock", "preview_ready", "checkout_start", "voucher_redeem", "export_docx", "tour_start", "hack"]) {
      expect(isClientEventName(n), n).toBe(false);
    }
  });
});

describe("funnel", () => {
  it("counts each visitor once per step, by first touch, with revenue joined through the account", async () => {
    const meta = { source: "meta", medium: "paid", campaign: "br_firstjob" };
    recordAnalytics({ name: "page_view", visitorId: "anon_a", path: "/pt/lp/primeiro-emprego", lang: "pt-BR", utm: meta });
    recordAnalytics({ name: "page_view", visitorId: "anon_a", path: "/start", lang: "pt-BR" });   // later page, no utm: first touch stays
    recordAnalytics({ name: "preview_ready", visitorId: "anon_a" });
    recordAnalytics({ name: "preview_ready", visitorId: "anon_a" });
    const u = await createUser({ email: "funnel@example.com", password: "password123" });
    linkVisitor(u.id, "anon_a");
    recordAnalytics({ name: "signup", visitorId: "anon_a", userId: u.id });
    recordAnalytics({ name: "unlock", visitorId: "anon_a", userId: u.id });
    settlePayment({ provider: "mercadopago", externalId: "pay-funnel-1", userId: u.id, pack: "1", credits: 1, amount: 39, currency: "BRL", status: "approved" });
    recordAnalytics({ name: "page_view", visitorId: "anon_b", path: "/", refHost: "google.com" });

    const r = acquisitionReport(7);
    expect(r.kpis).toMatchObject({ visitors: 2, previews: 1, signups: 1, unlocks: 1, payers: 1 });
    expect(r.funnel.map((f) => f.count)).toEqual([2, 1, 1, 1, 1]);
    const row = r.bySource.find((x) => x.campaign === "br_firstjob")!;
    expect(row).toMatchObject({ source: "meta", medium: "paid", page_view: 1, preview_ready: 1, signup: 1, unlock: 1, purchase: 1 });
    expect(row.revenue).toEqual([{ currency: "BRL", total: 39 }]);
    expect(r.bySource.find((x) => x.source === "google.com")).toMatchObject({ page_view: 1, preview_ready: 0 });
    expect(r.byLanding.find((x) => x.landing === "/pt/lp/primeiro-emprego")).toMatchObject({ page_view: 1, signup: 1 });
    // No IP column anywhere in the store.
    const cols = (getDb().prepare("PRAGMA table_info(events)").all() as { name: string }[]).map((c) => c.name);
    expect(cols.some((c) => /ip/i.test(c))).toBe(false);
  });

  it("caps one visitor per day and deletes only events past the retention window", () => {
    for (let i = 0; i < 10; i++) recordAnalytics({ name: "cta_click", visitorId: "anon_spam" });
    const n = (getDb().prepare("SELECT COUNT(*) n FROM events WHERE visitorId = 'anon_spam'").get() as { n: number }).n;
    expect(n).toBe(8);
    const db = getDb();
    db.prepare("INSERT INTO events (at, day, visitorId, name) VALUES (?,?,?,?)").run("2020-01-01T00:00:00Z", "2020-01-01", "anon_old", "page_view");
    const before = (db.prepare("SELECT COUNT(*) n FROM events").get() as { n: number }).n;
    expect(purgeOld(new Date(), true)).toBe(1);
    expect((db.prepare("SELECT COUNT(*) n FROM events").get() as { n: number }).n).toBe(before - 1);
  });
});

describe("beacon admission", () => {
  it("drops beacons without a cookie, caps new visitors per IP, and caps events per IP", () => {
    expect(admitBeacon({ hasCookie: false, visitorId: "anon_nocookie", ip: "198.51.100.1" })).toBe(false);
    // Made-up cookies from one IP: only 3 never-seen visitors a day get in.
    const fresh = [0, 1, 2, 3, 4].map((i) => {
      const ok = admitBeacon({ hasCookie: true, visitorId: `anon_forged_${i}`, ip: "198.51.100.2" });
      if (ok) recordAnalytics({ name: "page_view", visitorId: `anon_forged_${i}`, path: "/x" });
      return ok;
    });
    expect(fresh).toEqual([true, true, true, false, false]);
    // A visitor we already know keeps counting from that IP, until the hourly IP budget (12) runs out.
    const known = Array.from({ length: 10 }, () => admitBeacon({ hasCookie: true, visitorId: "anon_forged_0", ip: "198.51.100.2" }));
    expect(known.filter(Boolean)).toHaveLength(7);
    // Another IP is not affected.
    expect(admitBeacon({ hasCookie: true, visitorId: "anon_other_ip", ip: "198.51.100.3" })).toBe(true);
  });
});
