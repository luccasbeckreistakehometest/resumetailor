import { getDb, nowIso } from "@/lib/server/db";

export interface OnboardingRow { id: string; tourCompleted: number; tourStep: number; firstSeenAt: string; completedAt: string | null; events: string; tourVersion: number }
/** Bumped when the tour's steps change: a saved step from another version starts over (a finished tour stays finished). */
export const TOUR_VERSION = 2;
export interface OnboardingEvent { at: string; type: string; meta?: Record<string, unknown> }

/** Read-only: what a GET may use. A visitor with no row yet simply has no progress. */
export function peekOnboarding(ownerId: string): Pick<OnboardingRow, "tourCompleted" | "tourStep"> & { firstSeenAt: string | null } {
  const row = getDb().prepare("SELECT tourCompleted, tourStep, firstSeenAt, tourVersion FROM onboarding WHERE id = ?").get(ownerId) as OnboardingRow | undefined;
  if (!row) return { tourCompleted: 0, tourStep: 0, firstSeenAt: null };
  return { tourCompleted: row.tourCompleted, tourStep: row.tourVersion === TOUR_VERSION ? row.tourStep : 0, firstSeenAt: row.firstSeenAt };
}

export function getOnboarding(ownerId: string): OnboardingRow {
  const db = getDb();
  let row = db.prepare("SELECT * FROM onboarding WHERE id = ?").get(ownerId) as OnboardingRow | undefined;
  if (!row) {
    db.prepare("INSERT INTO onboarding (id, firstSeenAt) VALUES (?, ?)").run(ownerId, nowIso());
    row = db.prepare("SELECT * FROM onboarding WHERE id = ?").get(ownerId) as OnboardingRow;
  }
  return row;
}

/** The first session is kept as a timeline so the product team can see what a newcomer actually did. */
export function recordEvent(ownerId: string, type: string, meta?: Record<string, unknown>): void {
  const row = getOnboarding(ownerId);
  const events = JSON.parse(row.events) as OnboardingEvent[];
  if (events.length >= 200) return;
  events.push({ at: nowIso(), type, meta });
  getDb().prepare("UPDATE onboarding SET events = ? WHERE id = ?").run(JSON.stringify(events), ownerId);
}

export function setTourStep(ownerId: string, step: number, completed: boolean): OnboardingRow {
  getOnboarding(ownerId);
  getDb().prepare("UPDATE onboarding SET tourStep = ?, tourCompleted = ?, completedAt = COALESCE(completedAt, ?), tourVersion = ? WHERE id = ?")
    .run(step, completed ? 1 : 0, completed ? nowIso() : null, TOUR_VERSION, ownerId);
  return getOnboarding(ownerId);
}
