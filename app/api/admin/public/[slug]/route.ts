import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/session";
import { serialisePublic, setTakenDown } from "@/lib/server/publicResumes";

const schema = z.object({ down: z.boolean() });

/** Takedown (or restore) of a public web résumé. A taken-down page is offline and its owner cannot re-enable it. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const row = setTakenDown(slug, parsed.data.down);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  console.info(`[admin] ${admin.email} ${parsed.data.down ? "took down" : "restored"} /cv/${slug}`);
  return NextResponse.json({ publicResume: serialisePublic(row) });
}
