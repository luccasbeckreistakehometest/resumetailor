import { NextResponse } from "next/server";
import { currentUserRow } from "@/lib/server/session";
import { exportAccount } from "@/lib/server/account";
import { jsonError } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";

/** "Download my data": the whole account as a JSON file. POST, because it is rate-limited (a write). */
export async function POST() {
  const row = await currentUserRow();
  if (!row) return jsonError("sign_in_required", 401);
  const rl = take("EXPORT_USER_HOUR", row.id);
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfter: rl.retryAfter });
  const data = exportAccount(row.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="resumetailor-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
