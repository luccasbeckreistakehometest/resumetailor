import { cookies } from "next/headers";
import { ANON_COOKIE, SESSION_COOKIE, newAnonId, readAnonCookie, signAnonId, signSession, verifySession, type SessionPayload } from "@/lib/server/auth";
import { anonHasWork } from "@/lib/server/anon";
import { ensureAdmin, findById, toPublic, type PublicUser, type UserRow } from "@/lib/server/users";
import { secureCookies } from "@/lib/server/env";

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

/** The visitor id the rt_anon cookie carries, once its signature checks out. */
export async function anonId(): Promise<string | undefined> {
  return readAnonCookie((await cookies()).get(ANON_COOKIE)?.value)?.id;
}

export interface OwnerIdentity {
  userId: string | null; anonId: string; isNewAnon: boolean; mustChangePassword: boolean;
  /** The rt_anon value to write on the way out (a new id, or a legacy one re-signed), or null. */
  anonCookie: string | null;
}

/**
 * Owner key for rows and onboarding: the user id when logged in, else the anonymous cookie.
 *
 * The cookie is only believed when it was minted here: a signed value, or an unsigned one from
 * before signing that still owns work (re-signed on the way out). Anything invented is treated as
 * a first visit, which is what makes `isNewAnon` and every per-owner cap mean something.
 */
export async function ownerKey(): Promise<OwnerIdentity> {
  const user = await currentUser();
  const cookie = readAnonCookie((await cookies()).get(ANON_COOKIE)?.value);
  if (user) return { userId: user.id, anonId: cookie?.id ?? "", isNewAnon: false, mustChangePassword: user.mustChangePassword, anonCookie: null };
  if (cookie && (cookie.signed || anonHasWork(cookie.id))) {
    return { userId: null, anonId: cookie.id, isNewAnon: false, mustChangePassword: false, anonCookie: cookie.signed ? null : signAnonId(cookie.id) };
  }
  const fresh = newAnonId();
  return { userId: null, anonId: fresh, isNewAnon: true, mustChangePassword: false, anonCookie: signAnonId(fresh) };
}

export const ANON_COOKIE_OPTIONS = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365,
  secure: secureCookies(),
};
export const SESSION_COOKIE_OPTIONS = { ...ANON_COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 };

/** A fresh session cookie for this account at its current session version. */
export const sessionTokenFor = (user: UserRow) => signSession({ userId: user.id, role: user.role, sv: user.sessionVersion ?? 0 });
