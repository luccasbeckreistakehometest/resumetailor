import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ANON_COOKIE } from "@/lib/server/auth";
import { ANON_COOKIE_OPTIONS, ownerKey } from "@/lib/server/session";
import { clientIp, type LimitResult } from "@/lib/server/ratelimit";
import type { ApiErrorCode } from "@/lib/errors";

export interface Owner { userId: string | null; anonId: string; key: string; ip: string; isNewAnon: boolean }
export type Reply = { body: unknown; status?: number; headers?: Record<string, string> };

/**
 * Resolves who is calling and, for a first-time visitor, mints the anonymous cookie on the way out.
 * An account that signed in with an admin-issued temporary password is refused until it picks a
 * new one (the client sends it to /account); `allowPendingPasswordChange` opts a route out.
 */
export async function withOwner(fn: (owner: Owner) => Promise<Reply>, opts: { allowPendingPasswordChange?: boolean } = {}): Promise<NextResponse> {
  const owner = await ownerKey();
  if (owner.mustChangePassword && !opts.allowPendingPasswordChange) return jsonError("password_change_required", 403);
  const ip = clientIp(await headers());
  const key = owner.userId ?? owner.anonId;
  const { body, status, headers: extra } = await fn({ userId: owner.userId, anonId: owner.anonId, key, ip, isNewAnon: owner.isNewAnon });
  const res = NextResponse.json(body, { status: status ?? 200, headers: extra });
  if (owner.anonCookie) res.cookies.set(ANON_COOKIE, owner.anonCookie, ANON_COOKIE_OPTIONS);
  return res;
}

export const bad = (code: ApiErrorCode, status = 400): Reply => ({ body: { error: code }, status });

/** 429 with Retry-After. */
export const limited = (res: LimitResult, code: ApiErrorCode = "rate_limited"): Reply =>
  ({ body: { error: code, retryAfter: res.retryAfter }, status: 429, headers: { "Retry-After": String(res.retryAfter) } });

export const jsonError = (code: ApiErrorCode, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: code, ...extra }, { status, headers: status === 429 && typeof extra.retryAfter === "number" ? { "Retry-After": String(extra.retryAfter) } : undefined });

export async function requestIp(): Promise<string> {
  return clientIp(await headers());
}
