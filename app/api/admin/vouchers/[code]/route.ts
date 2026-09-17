import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { setVoucherDisabled } from "@/lib/server/vouchers";

export async function PATCH(request: Request, ctx: { params: Promise<{ code: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { code } = await ctx.params;
  const { disabled } = await request.json().catch(() => ({}));
  const v = setVoucherDisabled(code, disabled === true);
  return v ? NextResponse.json({ voucher: v }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
