import { createHmac } from "node:crypto";
import { getDb, getSetting, newId, nowIso, setSetting } from "@/lib/server/db";
import { authSecret, hashPassword, verifyPassword } from "@/lib/server/auth";
import { envNumber } from "@/lib/server/env";

export interface UserRow {
  id: string; email: string; name: string; passwordHash: string; role: "user" | "admin";
  credits: number; lang: string; createdAt: string; lastSeenAt: string | null;
  sessionVersion: number; disabledAt: string | null; termsAcceptedAt: string | null; termsVersion: string | null;
  signupIp: string | null; mustChangePassword: number;
}
export interface PublicUser {
  id: string; email: string; name: string; role: "user" | "admin"; credits: number; lang: string; createdAt: string;
  mustChangePassword: boolean;
}

/** One free credit on signup: the product's promise is that the first kit costs nothing. */
export const SIGNUP_CREDITS = 1;
/** Bumped whenever the terms or the privacy policy change in a way that needs new consent. */
export const TERMS_VERSION = "2026-09-17";

export const toPublic = (u: UserRow): PublicUser => ({
  id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits, lang: u.lang, createdAt: u.createdAt,
  mustChangePassword: u.mustChangePassword === 1,
});

export function findByEmail(email: string): UserRow | null {
  return (getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as UserRow) ?? null;
}
export function findById(id: string): UserRow | null {
  return (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow) ?? null;
}

/** Signup bonuses already handed to accounts created from this IP in the last 30 days. */
export function signupBonusesFromIp(ip: string, now = Date.now()): number {
  const since = new Date(now - 30 * 86_400_000).toISOString();
  const row = getDb().prepare(`SELECT COUNT(*) n FROM users u WHERE u.signupIp = ? AND u.createdAt >= ?
    AND EXISTS (SELECT 1 FROM credit_ledger l WHERE l.userId = u.id AND l.reason = 'signup_bonus')`).get(ip, since) as { n: number };
  return row.n;
}
export const signupBonusCap = () => envNumber("SIGNUP_BONUS_PER_IP_30D", 2);

export async function createUser(input: {
  email: string; password: string; name?: string; lang?: string; role?: "user" | "admin";
  ip?: string | null; termsAccepted?: boolean; bonus?: boolean;
}): Promise<UserRow> {
  const db = getDb();
  const id = newId("usr");
  const email = input.email.trim().toLowerCase();
  const hash = await hashPassword(input.password);
  const at = nowIso();
  db.transaction(() => {
    // Decided inside the write transaction so two parallel signups from one IP cannot both slip under the cap.
    const bonus = input.role !== "admin" && input.bonus !== false && (!input.ip || signupBonusesFromIp(input.ip) < signupBonusCap());
    const credits = bonus ? SIGNUP_CREDITS : 0;
    db.prepare(`INSERT INTO users (id,email,name,passwordHash,role,credits,lang,createdAt,signupIp,termsAcceptedAt,termsVersion)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, email, input.name ?? "", hash, input.role ?? "user", credits, input.lang ?? "en", at, input.ip ?? null,
        input.termsAccepted ? at : null, input.termsAccepted ? TERMS_VERSION : null);
    if (credits > 0) {
      db.prepare("INSERT INTO credit_ledger (id,userId,delta,reason,ref,balanceAfter,createdAt) VALUES (?,?,?,?,?,?,?)")
        .run(newId("led"), id, credits, "signup_bonus", null, credits, at);
    }
  }).immediate();
  return findById(id)!;
}

/** The account behind a correct email + password; disabled accounts never authenticate. */
export async function authenticate(email: string, password: string): Promise<UserRow | null> {
  const user = findByEmail(email);
  if (!user) {
    // Same work either way, so response time does not reveal which emails have accounts.
    await verifyPassword(password, "00000000000000000000000000000000:" + "0".repeat(64));
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  if (user.disabledAt) return null;
  getDb().prepare("UPDATE users SET lastSeenAt = ? WHERE id = ?").run(nowIso(), user.id);
  return user;
}

/** New password; every other session is signed out by the version bump. */
export async function setPassword(userId: string, password: string, opts: { mustChange?: boolean } = {}): Promise<UserRow> {
  const hash = await hashPassword(password);
  getDb().prepare("UPDATE users SET passwordHash = ?, sessionVersion = sessionVersion + 1, mustChangePassword = ? WHERE id = ?")
    .run(hash, opts.mustChange ? 1 : 0, userId);
  return findById(userId)!;
}

export function bumpSessionVersion(userId: string): UserRow | null {
  getDb().prepare("UPDATE users SET sessionVersion = sessionVersion + 1 WHERE id = ?").run(userId);
  return findById(userId);
}

export function setDisabled(userId: string, disabled: boolean): UserRow | null {
  getDb().prepare("UPDATE users SET disabledAt = ?, sessionVersion = sessionVersion + (CASE WHEN ? THEN 1 ELSE 0 END) WHERE id = ? AND role != 'admin'")
    .run(disabled ? nowIso() : null, disabled ? 1 : 0, userId);
  return findById(userId);
}

/** Atomic credit movement. Throws when it would take the balance negative. */
export function moveCredits(userId: string, delta: number, reason: string, ref: string | null): number {
  const db = getDb();
  return db.transaction(() => {
    const row = db.prepare("SELECT credits FROM users WHERE id = ?").get(userId) as { credits: number } | undefined;
    if (!row) throw new Error("user not found");
    const after = row.credits + delta;
    if (after < 0) throw new Error("insufficient credits");
    db.prepare("UPDATE users SET credits = ? WHERE id = ?").run(after, userId);
    db.prepare("INSERT INTO credit_ledger (id,userId,delta,reason,ref,balanceAfter,createdAt) VALUES (?,?,?,?,?,?,?)")
      .run(newId("led"), userId, delta, reason, ref, after, nowIso());
    return after;
  })();
}

/** Rows an anonymous visitor produced become theirs the moment they sign up. */
export function claimAnonymous(userId: string, anonId: string | undefined): void {
  if (!anonId) return;
  const db = getDb();
  db.prepare("UPDATE generations SET userId = ?, anonId = NULL WHERE anonId = ? AND userId IS NULL").run(userId, anonId);
  db.prepare("UPDATE interview_sessions SET userId = ?, anonId = NULL WHERE anonId = ? AND userId IS NULL").run(userId, anonId);
  db.prepare("UPDATE applications SET userId = ?, anonId = NULL WHERE anonId = ? AND userId IS NULL").run(userId, anonId);
  db.prepare("UPDATE voice_briefings SET ownerId = ? WHERE ownerId = ?").run(userId, anonId);
  type Onb = { events: string; tourCompleted: number; tourStep: number; firstSeenAt: string; completedAt: string | null };
  const onb = db.prepare("SELECT * FROM onboarding WHERE id = ?").get(anonId) as Onb | undefined;
  if (onb && !db.prepare("SELECT 1 FROM onboarding WHERE id = ?").get(userId)) {
    db.prepare("INSERT INTO onboarding (id,tourCompleted,tourStep,firstSeenAt,completedAt,events) VALUES (?,?,?,?,?,?)")
      .run(userId, onb.tourCompleted, onb.tourStep, onb.firstSeenAt, onb.completedAt, onb.events);
  }
}

const adminFingerprint = (email: string, password: string) =>
  createHmac("sha256", authSecret()).update(`admin|${email}|${password}`).digest("hex");
let adminChecked = false;

/**
 * The admin account comes from env so no credential is ever committed. Checked once per process:
 * created when missing, and its password re-synced when ADMIN_PASSWORD changed since the last
 * boot (a keyed fingerprint of the env value is kept, never the value). A password changed in the
 * app survives restarts as long as the env value stays the same. Outside production a known
 * default is used so the panel opens immediately.
 */
export async function ensureAdmin(): Promise<void> {
  if (adminChecked) return;
  adminChecked = true;
  const prod = process.env.NODE_ENV === "production";
  const email = (process.env.ADMIN_EMAIL?.trim() || (prod ? "" : "admin@resumetailor.app")).toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim() || (prod ? "" : "resumetailor2026");
  if (!email || !password || email.startsWith("#") || password.startsWith("#")) return;
  try {
    const fp = adminFingerprint(email, password);
    const existing = findByEmail(email);
    if (!existing) {
      await createUser({ email, password, name: "Admin", role: "admin" });
    } else if (getSetting("admin_env_fp") !== fp) {
      await setPassword(existing.id, password);
      getDb().prepare("UPDATE users SET role = 'admin', disabledAt = NULL WHERE id = ?").run(existing.id);
    }
    setSetting("admin_env_fp", fp);
  } catch (error) {
    adminChecked = false;
    console.error("ensureAdmin", error);
  }
}

/** Test hook: lets a unit test simulate a restart. */
export const __resetAdminCheck = () => { adminChecked = false; };
