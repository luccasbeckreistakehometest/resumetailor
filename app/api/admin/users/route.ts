import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** User lookup by email or name fragment (or the newest accounts when the query is empty). */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = getDb().prepare(`SELECT id, email, name, role, credits, lang, createdAt, lastSeenAt, disabledAt,
      (SELECT COUNT(*) FROM generations g WHERE g.userId = u.id) kits,
      (SELECT COUNT(*) FROM payments p WHERE p.userId = u.id AND p.status = 'approved') paid
    FROM users u WHERE (? = '' OR lower(email) LIKE ? OR lower(name) LIKE ?) ORDER BY createdAt DESC LIMIT 50`).all(q, like, like);
  return NextResponse.json({ items: rows });
}
