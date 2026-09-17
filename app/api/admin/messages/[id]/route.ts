import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/session";
import { CONTACT_STATUSES, setContactStatus } from "@/lib/server/contact";

const schema = z.object({ status: z.enum(CONTACT_STATUSES) });

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const row = setContactStatus(id, parsed.data.status);
  return row ? NextResponse.json({ item: row }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
