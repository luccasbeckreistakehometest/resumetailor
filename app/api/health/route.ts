import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Liveness for the compose healthcheck and uptime monitors: no secrets, no writes. */
export async function GET() {
  let db = false;
  try { db = (getDb().prepare("SELECT 1 AS one").get() as { one: number }).one === 1; } catch { db = false; }
  return NextResponse.json({ ok: db, db }, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
