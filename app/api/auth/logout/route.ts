import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { SESSION_COOKIE_OPTIONS } from "@/lib/server/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
