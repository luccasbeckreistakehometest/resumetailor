import { cookies } from "next/headers";
import { ANON_COOKIE, SESSION_COOKIE, newAnonId, signSession, verifySession, type SessionPayload } from "@/lib/server/auth";
import { ensureAdmin, findById, toPublic, type PublicUser, type UserRow } from "@/lib/server/users";

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * The signed-in account, or null. A token is only honoured while its session version matches
 * the account's (password change, "sign out everywhere" and disabling all bump it) and the
 * account is not disabled.
 */
export async function currentUserRow(): Promise<UserRow | null> {
  await ensureAdmin();
  const session = await getSession();
  if (!session) return null;
  const row = findById(session.userId);
  if (!row || row.disabledAt || (row.sessionVersion ?? 0) !== session.sv) return null;
  return row;
}

export async function currentUser(): Promise<PublicUser | null> {
  const row = await currentUserRow();
  return row ? toPublic(row) : null;
}

export async function requireAdmin(): Promise<PublicUser | null> {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

export async function anonId(): Promise<string | undefined> {
  return (await cookies()).get(ANON_COOKIE)?.value;
}

/** Owner key for rows and onboarding: the user id when logged in, else the anonymous cookie. */
export async function ownerKey(): Promise<{ userId: string | null; anonId: string; isNewAnon: boolean }> {
  const user = await currentUser();
  const existing = await anonId();
  if (user) return { userId: user.id, anonId: existing ?? "", isNewAnon: false };
  if (existing) return { userId: null, anonId: existing, isNewAnon: false };
  return { userId: null, anonId: newAnonId(), isNewAnon: true };
}

export const ANON_COOKIE_OPTIONS = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
};
export const SESSION_COOKIE_OPTIONS = { ...ANON_COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 };

/** A fresh session cookie for this account at its current session version. */
export const sessionTokenFor = (user: UserRow) => signSession({ userId: user.id, role: user.role, sv: user.sessionVersion ?? 0 });
