import { getDb, getSetting, nowIso, setSetting } from "@/lib/server/db";
import { envNumber } from "@/lib/server/env";
import { cleanProps, type EventName, type Utm } from "@/lib/analytics/events";

/**
 * The first-party event store. Visitors are the existing visitor cookie (or, once signed in, the
 * cookie the account was created from). No IP, no fingerprint. First touch is kept per visitor.
 */
export interface EventInput {
  name: EventName; visitorId: string | null; userId?: string | null; sessionId?: string | null;
  path?: string; lang?: string; utm?: Partial<Utm>; refHost?: string; device?: string; props?: unknown;
}

export const DAILY_EVENT_CAP = () => envNumber("ANALYTICS_EVENTS_PER_VISITOR_DAY", 500);
export const retentionDays = () => envNumber("ANALYTICS_RETENTION_DAYS", 180);
const day = (iso: string) => iso.slice(0, 10);
const s = (v: unknown, max = 100) => (typeof v === "string" ? v.slice(0, max) : "");

/** Stores one event; false when capped or anonymous-less. Never throws (analytics must not break a request). */
export function recordAnalytics(e: EventInput, now = new Date()): boolean {
  try {
    const db = getDb();
    const at = now.toISOString();
    const visitor = e.visitorId || (e.userId ? `u:${e.userId}` : null);
    if (!visitor) return false;
    const today = day(at);
    const count = (db.prepare("SELECT COUNT(*) n FROM events WHERE visitorId = ? AND day = ?").get(visitor, today) as { n: number }).n;
    if (count >= DAILY_EVENT_CAP()) return false;
    const u = e.utm ?? {};
    const props = cleanProps(e.props);
    db.prepare(`INSERT INTO events (at, day, visitorId, sessionId, userId, name, path, lang, source, medium, campaign, content, term, refHost, device, props)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      at, today, visitor, s(e.sessionId, 40) || null, e.userId ?? null, e.name, s(e.path, 200), s(e.lang, 10),
      s(u.source), s(u.medium), s(u.campaign), s(u.content), s(u.term), s(e.refHost), s(e.device, 10), props ? JSON.stringify(props) : null,
    );
    // First touch: the first event we ever see from this visitor decides where they came from.
    db.prepare(`INSERT OR IGNORE INTO attribution (visitorId, firstAt, landingPath, source, medium, campaign, content, term, refHost, userId)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(visitor, at, s(e.path, 200), s(u.source), s(u.medium), s(u.campaign), s(u.content), s(u.term), s(e.refHost), e.userId ?? null);
    if (e.userId) db.prepare("UPDATE attribution SET userId = COALESCE(userId, ?) WHERE visitorId = ?").run(e.userId, visitor);
    purgeOld(now);
    return true;
  } catch (error) {
    console.error("recordAnalytics", error);
    return false;
  }
}

/** At most once a day: events older than the retention window go. */
export function purgeOld(now = new Date(), force = false): number {
  const today = day(now.toISOString());
  if (!force && getSetting("analytics_purged_day") === today) return 0;
  setSetting("analytics_purged_day", today);
  const cutoff = day(new Date(now.getTime() - retentionDays() * 86_400_000).toISOString());
  return getDb().prepare("DELETE FROM events WHERE day < ?").run(cutoff).changes;
}

/**
 * The visitor behind an event: for an account, the cookie it was created from (so the journey
 * before and after signup is one visitor); otherwise the visitor cookie.
 */
export function visitorFor(owner: { anonId?: string | null; userId?: string | null }): string | null {
  if (owner.userId) {
    const row = getDb().prepare("SELECT attributionVisitorId v FROM users WHERE id = ?").get(owner.userId) as { v: string | null } | undefined;
    if (row?.v) return row.v;
  }
  return owner.anonId || null;
}

/** Server-side conversions (ad-blockers cannot hide them). */
export function serverEvent(owner: { anonId?: string | null; userId?: string | null }, name: EventName, props?: Record<string, string | number | boolean>): void {
  recordAnalytics({ name, visitorId: visitorFor(owner), userId: owner.userId ?? null, props });
}

export function linkVisitor(userId: string, visitorId: string | undefined | null): void {
  if (!visitorId) return;
  const db = getDb();
  db.prepare("UPDATE users SET attributionVisitorId = COALESCE(attributionVisitorId, ?) WHERE id = ?").run(visitorId, userId);
  db.prepare("UPDATE attribution SET userId = COALESCE(userId, ?) WHERE visitorId = ?").run(userId, visitorId);
}

/* ---------- the admin "Aquisição" report ---------- */

type Row = Record<string, string | number | null>;
type StepCounts = { page_view: number; preview_ready: number; signup: number; unlock: number; purchase: number };
export type SourceRow = StepCounts & { source: string; medium: string; campaign: string; revenue: { currency: string; total: number }[] };
const STEPS = ["page_view", "preview_ready", "signup", "unlock", "purchase"] as const;

export function acquisitionReport(days: number, now = new Date()) {
  const db = getDb();
  const since = day(new Date(now.getTime() - (days - 1) * 86_400_000).toISOString());
  const all = (sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as Row[];
  const stepCols = STEPS.map((st) => `COUNT(DISTINCT CASE WHEN e.name = '${st}' THEN e.visitorId END) AS ${st}`).join(", ");
  const grouped = (expr: string, alias: string) => all(`SELECT ${expr} AS ${alias}, ${stepCols}
    FROM events e LEFT JOIN attribution a ON a.visitorId = e.visitorId
    WHERE e.day >= ? GROUP BY 1 ORDER BY page_view DESC, preview_ready DESC LIMIT 50`, since);
  const bySource = all(`SELECT COALESCE(NULLIF(a.source,''), NULLIF(a.refHost,''), '(direct)') AS source, COALESCE(a.medium,'') AS medium, COALESCE(a.campaign,'') AS campaign, ${stepCols}
    FROM events e LEFT JOIN attribution a ON a.visitorId = e.visitorId
    WHERE e.day >= ? GROUP BY 1, 2, 3 ORDER BY page_view DESC, preview_ready DESC LIMIT 50`, since);
  const revenue = all(`SELECT COALESCE(NULLIF(a.source,''), NULLIF(a.refHost,''), '(direct)') AS source, COALESCE(a.medium,'') AS medium, COALESCE(a.campaign,'') AS campaign,
      p.currency AS currency, SUM(p.amount) AS total, COUNT(DISTINCT p.userId) AS payers
    FROM payments p JOIN users u ON u.id = p.userId LEFT JOIN attribution a ON a.visitorId = u.attributionVisitorId
    WHERE p.status = 'approved' AND substr(COALESCE(p.settledAt, p.createdAt), 1, 10) >= ? GROUP BY 1, 2, 3, 4`, since);
  const totals = db.prepare(`SELECT ${STEPS.map((st) => `COUNT(DISTINCT CASE WHEN name = '${st}' THEN visitorId END) AS ${st}`).join(", ")} FROM events WHERE day >= ?`).get(since) as Record<string, number>;
  const money = all(`SELECT currency, SUM(amount) AS total, COUNT(DISTINCT userId) AS payers FROM payments WHERE status = 'approved' AND substr(COALESCE(settledAt, createdAt), 1, 10) >= ? GROUP BY currency`, since);
  return {
    days, since,
    kpis: { visitors: totals.page_view ?? 0, previews: totals.preview_ready ?? 0, signups: totals.signup ?? 0, unlocks: totals.unlock ?? 0, payers: money.reduce((a, m) => a + Number(m.payers), 0), revenue: money },
    funnel: STEPS.map((st) => ({ step: st, count: totals[st] ?? 0 })),
    bySource: bySource.map((r) => ({ ...r, revenue: revenue.filter((m) => m.source === r.source && m.medium === r.medium && m.campaign === r.campaign).map((m) => ({ currency: String(m.currency), total: Number(m.total) })) })) as unknown as SourceRow[],
    byLanding: grouped("COALESCE(NULLIF(a.landingPath,''), '(unknown)')", "landing"),
    byLang: grouped("COALESCE(NULLIF(e.lang,''), '?')", "lang"),
    daily: all(`SELECT day, COUNT(DISTINCT CASE WHEN name='page_view' THEN visitorId END) AS visitors, COUNT(DISTINCT CASE WHEN name='preview_ready' THEN visitorId END) AS previews,
      COUNT(DISTINCT CASE WHEN name='signup' THEN visitorId END) AS signups FROM events WHERE day >= ? GROUP BY day ORDER BY day`, since),
    tours: db.prepare("SELECT COUNT(DISTINCT CASE WHEN name='tour_start' THEN visitorId END) AS started, COUNT(DISTINCT CASE WHEN name='tour_done' THEN visitorId END) AS done FROM events WHERE day >= ?").get(since) as { started: number; done: number },
    campaigns: all("SELECT campaign, COUNT(*) AS visitors FROM attribution WHERE campaign != '' AND substr(firstAt,1,10) >= ? GROUP BY campaign ORDER BY visitors DESC LIMIT 20", since),
    now: nowIso(),
  };
}
export type AcquisitionReport = ReturnType<typeof acquisitionReport>;
