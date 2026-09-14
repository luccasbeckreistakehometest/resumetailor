import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/session";
import { findById, moveCredits, toPublic } from "@/lib/server/users";

const schema = z.object({ userId: z.string(), delta: z.number().int().min(-1000).max(1000) });

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    moveCredits(parsed.data.userId, parsed.data.delta, "admin_grant", null);
    return NextResponse.json({ user: toPublic(findById(parsed.data.userId)!) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
