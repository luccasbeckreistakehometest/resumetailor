import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS } from "@/lib/server/session";

/** Signs this browser out. "Sign out everywhere" lives at /api/account/logout-all. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
