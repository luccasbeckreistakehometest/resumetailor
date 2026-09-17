import { NextResponse } from "next/server";
import { normaliseCode } from "@/lib/server/vouchers";
import { baseUrl } from "@/lib/server/env";

/** A partner's code link: the pricing page with the code already in the field. */
export async function GET(_: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return NextResponse.redirect(`${baseUrl()}/pricing?code=${encodeURIComponent(normaliseCode(code))}#code`, 302);
}
