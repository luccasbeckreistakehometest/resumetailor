import { getDb, nowIso } from "@/lib/server/db";
import { emptyFacts, mergeFacts, parseFacts, type ProfileFacts } from "@/lib/profile/facts";

export const PROFILE_RESUME_MAX = 12_000;

interface ProfileRow { ownerKey: string; resume: string; facts: string; roles: string; updatedAt: string }
export interface ProfileView { resume: string; facts: ProfileFacts; roles: string[]; updatedAt: string }

const view = (r: ProfileRow): ProfileView => {
  let roles: string[] = [];
  try { roles = (JSON.parse(r.roles) as unknown[]).filter((x): x is string => typeof x === "string"); } catch {}
  return { resume: r.resume, facts: parseFacts(r.facts), roles, updatedAt: r.updatedAt };
};

/** The base résumé and facts of this owner (account id or visitor cookie). */
export function getProfile(ownerKey: string): ProfileView | null {
  const row = getDb().prepare("SELECT * FROM career_profiles WHERE ownerKey = ?").get(ownerKey) as ProfileRow | undefined;
  return row ? view(row) : null;
}

/**
 * Creates or updates the profile: a résumé replaces the stored one, facts are merged (never
 * dropped), a role joins the recent-roles list. One immediate transaction, so two tabs saving at
 * once cannot lose each other's facts.
 */
export function saveProfile(ownerKey: string, patch: { resume?: string; facts?: ProfileFacts; replaceFacts?: boolean; role?: string }): ProfileView {
  const db = getDb();
  db.transaction(() => {
    const cur = db.prepare("SELECT * FROM career_profiles WHERE ownerKey = ?").get(ownerKey) as ProfileRow | undefined;
    const base = cur ? view(cur) : { resume: "", facts: emptyFacts(), roles: [] as string[] };
    const resume = patch.resume !== undefined ? patch.resume.slice(0, PROFILE_RESUME_MAX) : base.resume;
    const facts = patch.facts ? (patch.replaceFacts ? mergeFacts(emptyFacts(), patch.facts) : mergeFacts(base.facts, patch.facts)) : base.facts;
    const role = patch.role?.trim().slice(0, 120);
    const roles = role ? [role, ...base.roles.filter((r) => r.toLowerCase() !== role.toLowerCase())].slice(0, 8) : base.roles;
    db.prepare(`INSERT INTO career_profiles (ownerKey, resume, facts, roles, updatedAt) VALUES (?,?,?,?,?)
      ON CONFLICT(ownerKey) DO UPDATE SET resume = excluded.resume, facts = excluded.facts, roles = excluded.roles, updatedAt = excluded.updatedAt`)
      .run(ownerKey, resume, JSON.stringify(facts), JSON.stringify(roles), nowIso());
  }).immediate();
  return getProfile(ownerKey)!;
}

export function deleteProfile(ownerKey: string): void {
  getDb().prepare("DELETE FROM career_profiles WHERE ownerKey = ?").run(ownerKey);
}

/**
 * At signup or login the visitor's profile becomes the account's. An account that already has
 * one keeps its résumé and gains the visitor's facts.
 */
export function claimProfile(userId: string, anonId: string): void {
  const anon = getProfile(anonId);
  if (!anon) return;
  const mine = getProfile(userId);
  if (!mine) saveProfile(userId, { resume: anon.resume, facts: anon.facts });
  else saveProfile(userId, { facts: anon.facts, resume: mine.resume || anon.resume });
  for (const r of [...anon.roles].reverse()) saveProfile(userId, { role: r });
  deleteProfile(anonId);
}
