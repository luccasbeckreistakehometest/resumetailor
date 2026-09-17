import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { listContacts } from "@/lib/server/contact";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  return NextResponse.json({ items: listContacts(status) });
}
