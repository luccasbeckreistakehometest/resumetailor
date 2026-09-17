import { NextResponse } from "next/server";
import { z } from "zod";
import { ANON_COOKIE, SESSION_COOKIE, verifyPassword } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, currentUserRow } from "@/lib/server/session";
import { deleteAccount } from "@/lib/server/account";
import { jsonError } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";

const schema = z.object({ password: z.string().max(200), confirm: z.string().max(200) });

/** "Delete my account": password plus the typed email, then everything goes (payments stay, anonymised). */
export async function POST(request: Request) {
  const row = await currentUserRow();
  if (!row) return jsonError("sign_in_required", 401);
  if (row.role === "admin") return jsonError("admin_protected", 403);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("bad_request", 400);
  const rl = take("PASSWORD_USER_15M", row.id);
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfter: rl.retryAfter });
  if (parsed.data.confirm.trim().toLowerCase() !== row.email) return jsonError("confirm_mismatch", 400);
  if (!(await verifyPassword(parsed.data.password, row.passwordHash))) return jsonError("password_wrong", 403);
  deleteAccount(row.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  res.cookies.set(ANON_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
