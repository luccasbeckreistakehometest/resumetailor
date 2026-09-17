import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS, currentUserRow } from "@/lib/server/session";
import { bumpSessionVersion } from "@/lib/server/users";
import { jsonError } from "@/lib/server/http";

/** "Sign out of every device": the session version moves on, so every existing cookie stops working. */
export async function POST() {
  const row = await currentUserRow();
  if (!row) return jsonError("sign_in_required", 401);
  bumpSessionVersion(row.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
