import { NextResponse } from "next/server";
import { contactSchema, saveContact } from "@/lib/server/contact";
import { currentUser } from "@/lib/server/session";
import { jsonError, requestIp } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";

/** The in-app contact form. Stored for the admin panel; a filled honeypot is accepted and dropped. */
export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("contact_invalid", 400);
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const ip = await requestIp();
  const rl = take("CONTACT_IP_HOUR", ip);
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfter: rl.retryAfter });
  const user = await currentUser();
  const { website: _hp, ...fields } = parsed.data;
  void _hp;
  const row = saveContact({ ...fields, userId: user?.id ?? null, ip });
  return NextResponse.json({ ok: true, id: row.id });
}
