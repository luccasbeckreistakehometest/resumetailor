/**
 * The follow-up radar: which applications need a nudge today, and why. Pure and date-injected.
 * Nothing is ever sent automatically — the person copies the message or opens their own app.
 */
export type RadarKind = "prep" | "thanks" | "followup" | "moveon" | "offer" | "feedback";
export interface RadarApp {
  id: string; stage: string; appliedAt: string | null; interviewAt: string | null; interviewAtTime: string | null;
  rejectedAt: string | null; lastContactAt: string | null; followUps: number; createdAt: string;
}
export interface RadarAlert { appId: string; kind: RadarKind; days: number }

const DAY = 86_400_000;
export const FOLLOW_UP_AFTER_DAYS = 7;
export const MAX_FOLLOW_UPS = 2;
const t = (iso: string | null) => (iso ? Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso) : NaN);
const latest = (...xs: number[]) => Math.max(...xs.filter((x) => Number.isFinite(x)), -Infinity);

/** At most one alert per application, the most urgent first. */
export function radarFor(a: RadarApp, now: number): RadarAlert | null {
  const contact = t(a.lastContactAt);
  const interview = Number.isFinite(t(a.interviewAtTime)) ? t(a.interviewAtTime) : t(a.interviewAt);
  if (a.stage === "rejected") {
    return Number.isFinite(contact) && contact >= t(a.rejectedAt) ? null : { appId: a.id, kind: "feedback", days: 0 };
  }
  if (a.stage === "offer") return { appId: a.id, kind: "offer", days: 0 };
  if (a.stage !== "applied" && a.stage !== "interview") return null;
  if (Number.isFinite(interview) && interview > now) return interview - now <= 48 * 3600_000 ? { appId: a.id, kind: "prep", days: 0 } : null;
  if (Number.isFinite(interview) && interview <= now && !(contact >= interview)) return { appId: a.id, kind: "thanks", days: Math.floor((now - interview) / DAY) };
  const since = latest(t(a.appliedAt), Number.isFinite(interview) && interview <= now ? interview : NaN, contact, a.stage === "applied" ? NaN : t(a.createdAt));
  if (!Number.isFinite(since)) return null;
  const days = Math.floor((now - since) / DAY);
  if (days < FOLLOW_UP_AFTER_DAYS) return null;
  return { appId: a.id, kind: a.followUps > MAX_FOLLOW_UPS ? "moveon" : "followup", days };
}

const ORDER: RadarKind[] = ["prep", "thanks", "followup", "offer", "feedback", "moveon"];
export function radar(apps: RadarApp[], now: number): RadarAlert[] {
  return apps.map((a) => radarFor(a, now)).filter((x): x is RadarAlert => !!x).sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind) || y.days - x.days);
}
