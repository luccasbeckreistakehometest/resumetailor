import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/session";
import { getDb } from "@/lib/server/db";
import { bumpSessionVersion, findById, setDisabled, setPassword } from "@/lib/server/users";
import { oneTimePassword } from "@/lib/server/auth";
import { paymentsFor } from "@/lib/server/payments";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** One account as support needs it: plan (prepaid credits), balance history, payments, kits, public pages. */
export async function GET(_: Request, ctx: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const u = findById(id);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const db = getDb();
  return NextResponse.json({
    user: { id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits, lang: u.lang, createdAt: u.createdAt, lastSeenAt: u.lastSeenAt, disabledAt: u.disabledAt, termsAcceptedAt: u.termsAcceptedAt, mustChangePassword: u.mustChangePassword === 1, signupIp: u.signupIp },
    ledger: db.prepare("SELECT delta, reason, ref, balanceAfter, createdAt FROM credit_ledger WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(id),
    payments: paymentsFor(id),
    kits: db.prepare("SELECT id, mode, title, targetRole, unlocked, costUsd, createdAt FROM generations WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(id),
    publicResumes: db.prepare("SELECT slug, enabled, takenDownAt, views, updatedAt FROM public_resumes WHERE userId = ? ORDER BY updatedAt DESC").all(id),
  });
}

const schema = z.object({ action: z.enum(["reset_password", "disable", "enable", "logout_all"]) });

/**
 * Support actions. A password reset returns a one-time password ONCE (it is not stored anywhere
 * readable); the user must change it after signing in, and every existing session ends.
 */
export async function POST(request: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const u = findById(id);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (u.role === "admin" && parsed.data.action !== "logout_all") return NextResponse.json({ error: "admin_protected" }, { status: 403 });
  switch (parsed.data.action) {
    case "reset_password": {
      const temporary = oneTimePassword();
      await setPassword(id, temporary, { mustChange: true });
      console.info(`[admin] ${admin.email} reset the password of ${u.id}`);
      return NextResponse.json({ ok: true, temporaryPassword: temporary }, { headers: { "Cache-Control": "no-store" } });
    }
    case "disable": setDisabled(id, true); break;
    case "enable": setDisabled(id, false); break;
    case "logout_all": bumpSessionVersion(id); break;
  }
  console.info(`[admin] ${admin.email} ${parsed.data.action} ${u.id}`);
  return NextResponse.json({ ok: true });
}
