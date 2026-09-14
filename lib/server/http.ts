import { NextResponse } from "next/server";
import { ANON_COOKIE } from "@/lib/server/auth";
import { ANON_COOKIE_OPTIONS, ownerKey } from "@/lib/server/session";

/** Resolves who is calling and, for a first-time visitor, mints the anonymous cookie on the way out. */
export async function withOwner(fn: (owner: { userId: string | null; anonId: string; key: string }) => Promise<{ body: unknown; status?: number }>): Promise<NextResponse> {
  const owner = await ownerKey();
  const key = owner.userId ?? owner.anonId;
  const { body, status } = await fn({ userId: owner.userId, anonId: owner.anonId, key });
  const res = NextResponse.json(body, { status: status ?? 200 });
  if (owner.isNewAnon) res.cookies.set(ANON_COOKIE, owner.anonId, ANON_COOKIE_OPTIONS);
  return res;
}

export const bad = (message: string, status = 400) => ({ body: { error: message }, status });
