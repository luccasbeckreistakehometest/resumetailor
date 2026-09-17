import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, verifyPassword } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, currentUserRow, sessionTokenFor } from "@/lib/server/session";
import { setPassword, toPublic } from "@/lib/server/users";
import { jsonError } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";

const schema = z.object({ current: z.string().max(200), next: z.string().max(200) });

/** Changes the password; every other device is signed out, this one gets a fresh session. */
export async function POST(request: Request) {
  const row = await currentUserRow();
  if (!row) return jsonError("sign_in_required", 401);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("bad_request", 400);
  if (parsed.data.next.length < 8) return jsonError("password_short", 400);
  const rl = take("PASSWORD_USER_15M", row.id);
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfter: rl.retryAfter });
  if (!(await verifyPassword(parsed.data.current, row.passwordHash))) return jsonError("password_wrong", 403);
  const updated = await setPassword(row.id, parsed.data.next);
  const res = NextResponse.json({ ok: true, user: toPublic(updated) });
  res.cookies.set(SESSION_COOKIE, sessionTokenFor(updated), SESSION_COOKIE_OPTIONS);
  return res;
}
