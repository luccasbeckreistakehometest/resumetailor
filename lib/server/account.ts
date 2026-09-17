import { getDb, nowIso } from "@/lib/server/db";
import { findById } from "@/lib/server/users";

const parse = (v: string | null) => { try { return v ? JSON.parse(v) : null; } catch { return v; } };

/**
 * Everything the product keeps about one account, as JSON (LGPD art. 18: access and
 * portability). Passwords and internal hashes are left out.
 */
export function exportAccount(userId: string) {
  const db = getDb();
  const u = findById(userId);
  if (!u) return null;
  const all = (sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as Record<string, unknown>[];
  return {
    exportedAt: nowIso(),
    account: { id: u.id, email: u.email, name: u.name, role: u.role, credits: u.credits, lang: u.lang, createdAt: u.createdAt, lastSeenAt: u.lastSeenAt, termsAcceptedAt: u.termsAcceptedAt, termsVersion: u.termsVersion },
    creditLedger: all("SELECT delta, reason, ref, balanceAfter, createdAt FROM credit_ledger WHERE userId = ? ORDER BY createdAt", userId),
    payments: all("SELECT provider, externalId, pack, credits, amount, currency, status, createdAt, settledAt, reversedAt FROM payments WHERE userId = ? ORDER BY createdAt", userId),
    kits: all("SELECT id, mode, source, lang, title, targetRole, input, result, matchBefore, matchAfter, unlocked, createdAt FROM generations WHERE userId = ? ORDER BY createdAt", userId)
      .map((g) => ({ ...g, input: parse(g.input as string), result: parse(g.result as string) })),
    kitTexts: all("SELECT v.generationId, v.kind, v.subject, v.body, v.createdAt FROM kit_variants v JOIN generations g ON g.id = v.generationId WHERE g.userId = ?", userId),
    publicResumes: all("SELECT slug, enabled, template, hideContact, indexable, views, createdAt, updatedAt FROM public_resumes WHERE userId = ?", userId),
    interviews: all("SELECT id, generationId, lang, mode, status, questions, turns, summary, createdAt, completedAt FROM interview_sessions WHERE userId = ? ORDER BY createdAt", userId)
      .map((s) => ({ ...s, questions: parse(s.questions as string), turns: parse(s.turns as string), summary: parse(s.summary as string) })),
    applications: all("SELECT company, role, link, stage, notes, nextStepAt, appliedAt, interviewAt, offerAt, rejectedAt, createdAt, updatedAt FROM applications WHERE userId = ? ORDER BY createdAt", userId),
    voiceBriefings: all("SELECT lang, transcript, extracted, createdAt FROM voice_briefings WHERE ownerId = ? ORDER BY createdAt", userId)
      .map((v) => ({ ...v, extracted: parse(v.extracted as string) })),
    onboarding: db.prepare("SELECT tourCompleted, tourStep, firstSeenAt, completedAt, events FROM onboarding WHERE id = ?").get(userId) ?? null,
    careerProfile: (() => { const p = db.prepare("SELECT resume, facts, roles, updatedAt FROM career_profiles WHERE ownerKey = ?").get(userId) as Record<string, string> | undefined; return p ? { ...p, facts: parse(p.facts), roles: parse(p.roles) } : null; })(),
    voucherRedemptions: all("SELECT code, createdAt FROM voucher_redemptions WHERE userId = ?", userId),
    referrals: all("SELECT status, createdAt, rewardedAt FROM referrals WHERE referrerId = ?", userId),
    contactMessages: all("SELECT topic, message, status, createdAt FROM contact_messages WHERE userId = ? ORDER BY createdAt", userId),
  };
}

/**
 * Deletes an account and everything tied to it (LGPD art. 18: elimination). Payment rows stay
 * for accounting, detached from the person (userId cleared; they hold no name or email).
 */
export function deleteAccount(userId: string): boolean {
  const db = getDb();
  return db.transaction(() => {
    const u = findById(userId);
    if (!u || u.role === "admin") return false;
    const gens = db.prepare("SELECT id FROM generations WHERE userId = ?").all(userId) as { id: string }[];
    const genIds = gens.map((g) => g.id);
    if (genIds.length) {
      const marks = genIds.map(() => "?").join(",");
      db.prepare(`UPDATE applications SET generationId = NULL WHERE generationId IN (${marks})`).run(...genIds);
      db.prepare(`DELETE FROM interview_sessions WHERE generationId IN (${marks})`).run(...genIds);
    }
    db.prepare("DELETE FROM interview_sessions WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM public_resumes WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM generations WHERE userId = ?").run(userId);            // kit_variants cascade
    db.prepare("DELETE FROM applications WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM voice_briefings WHERE ownerId = ?").run(userId);
    db.prepare("DELETE FROM onboarding WHERE id = ?").run(userId);
    db.prepare("DELETE FROM fit_checks WHERE ownerKey = ?").run(userId);
    db.prepare("DELETE FROM career_profiles WHERE ownerKey = ?").run(userId);
    db.prepare("DELETE FROM referrals WHERE referrerId = ? OR referredId = ?").run(userId, userId);
    db.prepare("DELETE FROM contact_messages WHERE userId = ? OR lower(email) = lower(?)").run(userId, u.email);
    // Cost records stay for the spend totals, with nothing that points to the person.
    db.prepare("UPDATE ai_usage SET ownerKey = 'deleted', ip = NULL WHERE ownerKey = ?").run(userId);
    db.prepare("UPDATE payments SET userId = NULL WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);                      // credit_ledger cascades
    return true;
  })();
}
