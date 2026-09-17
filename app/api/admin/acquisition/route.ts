import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { acquisitionReport } from "@/lib/server/analytics";

export const dynamic = "force-dynamic";

/** The "Aquisição" tab: visitors → previews → signups → unlocks → purchases, by first touch. */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  return NextResponse.json(acquisitionReport([7, 30, 90].includes(days) ? days : 30));
}
