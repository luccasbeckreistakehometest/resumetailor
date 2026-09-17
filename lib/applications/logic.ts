/**
 * The application tracker's arithmetic. No AI anywhere: stages, the milestones a stage change
 * implies, and the funnel that turns a board into "how is my search actually going".
 */
export const STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Stage = (typeof STAGES)[number];
export const isStage = (s: unknown): s is Stage => typeof s === "string" && (STAGES as readonly string[]).includes(s);

export interface Milestones { appliedAt: string | null; interviewAt: string | null; offerAt: string | null; rejectedAt: string | null }
export interface ApplicationLike extends Milestones { stage: Stage; nextStepAt: string | null }

export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const todayIso = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * Reaching a stage implies the ones before it: an interview means you applied, an offer means you
 * interviewed, a rejection means you applied. First dates are kept; nothing is ever unset.
 */
export function milestonesFor(stage: Stage, current: Milestones, today: string): Milestones {
  // Only the four milestone keys: callers pass whole rows, and nothing else may leak back into an update.
  const m: Milestones = { appliedAt: current.appliedAt, interviewAt: current.interviewAt, offerAt: current.offerAt, rejectedAt: current.rejectedAt };
  const set = (k: keyof Milestones) => { if (!m[k]) m[k] = today; };
  if (stage === "applied" || stage === "interview" || stage === "offer" || stage === "rejected") set("appliedAt");
  if (stage === "interview" || stage === "offer") set("interviewAt");
  if (stage === "offer") set("offerAt");
  if (stage === "rejected") set("rejectedAt");
  return m;
}

export interface Funnel {
  total: number; saved: number; applied: number; interviews: number; offers: number; rejected: number;
  /** interviews ÷ applied, in percent; null until something was applied to */
  interviewRate: number | null;
  /** offers ÷ interviews, in percent; null until an interview happened */
  offerRate: number | null;
  upcoming: number; overdue: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export function funnel(items: ApplicationLike[], today = todayIso()): Funnel {
  const applied = items.filter((a) => a.appliedAt).length;
  const interviews = items.filter((a) => a.interviewAt).length;
  const offers = items.filter((a) => a.offerAt).length;
  const soon = new Date(today); soon.setUTCDate(soon.getUTCDate() + 7);
  const soonIso = soon.toISOString().slice(0, 10);
  const open = items.filter((a) => a.nextStepAt && a.stage !== "rejected");
  return {
    total: items.length, saved: items.filter((a) => a.stage === "saved").length, applied, interviews, offers,
    rejected: items.filter((a) => a.stage === "rejected").length,
    interviewRate: pct(interviews, applied), offerRate: pct(offers, interviews),
    upcoming: open.filter((a) => a.nextStepAt! >= today && a.nextStepAt! <= soonIso).length,
    overdue: open.filter((a) => a.nextStepAt! < today).length,
  };
}

/** Cards with a next step, soonest first, so the board can say what to do today. */
export function nextSteps<T extends ApplicationLike>(items: T[], today = todayIso()): { item: T; overdue: boolean }[] {
  return items
    .filter((a) => a.nextStepAt && a.stage !== "rejected")
    .sort((a, b) => a.nextStepAt!.localeCompare(b.nextStepAt!))
    .map((item) => ({ item, overdue: item.nextStepAt! < today }));
}

/** A pasted job link without a scheme still has to open somewhere. */
export function normaliseLink(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
