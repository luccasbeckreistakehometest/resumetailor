import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/session";
import { createBatch, createVoucher, listRedemptions, listVouchers } from "@/lib/server/vouchers";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ vouchers: listVouchers(), redemptions: listRedemptions() });
}

const schema = z.object({
  mode: z.enum(["single", "batch"]), code: z.string().max(32).optional(), credits: z.number().int().min(1).max(50),
  maxRedemptions: z.number().int().min(1).max(100_000).default(1), count: z.number().int().min(1).max(500).default(10),
  campaign: z.string().max(60).default(""), note: z.string().max(200).default(""), expiresAt: z.string().max(40).nullable().optional(),
});

/** One code (custom or random, N uses) or a batch of N single-use codes for a partner. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "check_fields" }, { status: 400 });
  const b = parsed.data;
  const expiresAt = b.expiresAt ? new Date(b.expiresAt).toISOString() : null;
  if (b.mode === "batch") return NextResponse.json({ created: createBatch({ count: b.count, credits: b.credits, campaign: b.campaign, note: b.note, expiresAt }) });
  const v = createVoucher({ code: b.code || undefined, credits: b.credits, maxRedemptions: b.maxRedemptions, campaign: b.campaign, note: b.note, expiresAt });
  if (!v) return NextResponse.json({ error: "check_fields" }, { status: 409 });
  return NextResponse.json({ created: [v] });
}
