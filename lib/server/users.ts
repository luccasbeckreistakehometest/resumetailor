import { getDb, newId, nowIso } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/auth";

export interface UserRow {
  id: string; email: string; name: string; passwordHash: string; role: "user" | "admin";
  credits: number; lang: string; createdAt: string; lastSeenAt: string | null;
}
export interface PublicUser {
  id: string; email: string; name: string; role: "user" | "admin"; credits: number; lang: string; createdAt: string;
}

/** One free credit on signup: the product's promise is that the first kit costs nothing. */
export const SIGNUP_CREDITS = 1;

export const toPublic = (u: UserRow): PublicUser =>
  ({ id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits, lang: u.lang, createdAt: u.createdAt });

export function findByEmail(email: string): UserRow | null {
  return (getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as UserRow) ?? null;
}
export function findById(id: string): UserRow | null {
  return (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow) ?? null;
}

export function createUser(input: { email: string; password: string; name?: string; lang?: string; role?: "user" | "admin" }): UserRow {
  const db = getDb();
  const id = newId("usr");
  const email = input.email.trim().toLowerCase();
  const credits = input.role === "admin" ? 0 : SIGNUP_CREDITS;
  const at = nowIso();
  db.transaction(() => {
    db.prepare("INSERT INTO users (id,email,name,passwordHash,role,credits,lang,createdAt) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, email, input.name ?? "", hashPassword(input.password), input.role ?? "user", credits, input.lang ?? "en", at);
    if (credits > 0) {
      db.prepare("INSERT INTO credit_ledger (id,userId,delta,reason,ref,balanceAfter,createdAt) VALUES (?,?,?,?,?,?,?)")
        .run(newId("led"), id, credits, "signup_bonus", null, credits, at);
    }
  })();
  return findById(id)!;
}

export function authenticate(email: string, password: string): UserRow | null {
  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  getDb().prepare("UPDATE users SET lastSeenAt = ? WHERE id = ?").run(nowIso(), user.id);
  return user;
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
  type Onb = { events: string; tourCompleted: number; tourStep: number; firstSeenAt: string; completedAt: string | null };
  const onb = db.prepare("SELECT * FROM onboarding WHERE id = ?").get(anonId) as Onb | undefined;
  if (onb && !db.prepare("SELECT 1 FROM onboarding WHERE id = ?").get(userId)) {
    db.prepare("INSERT INTO onboarding (id,tourCompleted,tourStep,firstSeenAt,completedAt,events) VALUES (?,?,?,?,?,?)")
      .run(userId, onb.tourCompleted, onb.tourStep, onb.firstSeenAt, onb.completedAt, onb.events);
  }
}

/**
 * The admin account comes from env so no credential is ever committed. Outside production a
 * known default is created so the panel opens immediately.
 */
export function ensureAdmin(): void {
  const prod = process.env.NODE_ENV === "production";
  const email = process.env.ADMIN_EMAIL ?? (prod ? "" : "admin@resumetailor.app");
  const password = process.env.ADMIN_PASSWORD ?? (prod ? "" : "resumetailor2026");
  if (!email || !password || findByEmail(email)) return;
  createUser({ email, password, name: "Admin", role: "admin" });
}
