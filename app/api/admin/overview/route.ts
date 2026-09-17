import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { getDb } from "@/lib/server/db";
import { aiHealthSnapshot } from "@/lib/ai/health";
import { dailyBudget, recentAiErrors, spendByFeatureToday, spentToday } from "@/lib/server/spend";
import { paymentsConfig } from "@/lib/server/payments";
import { insightsEnabled } from "@/lib/ai/insights";
import { ttsProvider } from "@/lib/server/tts";
import { canSell, missingSellerIdentity } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const one = <T,>(sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as T;
  const all = <T,>(sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as T[];
  return NextResponse.json({
    totals: {
      users: one<{ n: number }>("SELECT COUNT(*) n FROM users WHERE role='user'").n,
      generations: one<{ n: number }>("SELECT COUNT(*) n FROM generations").n,
      unlocked: one<{ n: number }>("SELECT COUNT(*) n FROM generations WHERE unlocked=1").n,
      voice: one<{ n: number }>("SELECT COUNT(*) n FROM generations WHERE source='voice'").n,
      aiCostUsd: one<{ c: number }>("SELECT COALESCE(SUM(costUsd),0) c FROM generations").c,
      aiSpendAllTime: one<{ c: number }>("SELECT COALESCE(SUM(costUsd),0) c FROM ai_usage").c,
      messagesNew: one<{ n: number }>("SELECT COUNT(*) n FROM contact_messages WHERE status='new'").n,
      // Real tour starts/finishes (events), not every visitor that loaded a page.
      toursStarted: one<{ n: number }>("SELECT COUNT(DISTINCT visitorId) n FROM events WHERE name='tour_start'").n,
      toursCompleted: one<{ n: number }>("SELECT COUNT(DISTINCT visitorId) n FROM events WHERE name='tour_done'").n,
      interviews: one<{ n: number }>("SELECT COUNT(*) n FROM interview_sessions").n,
      interviewsDone: one<{ n: number }>("SELECT COUNT(*) n FROM interview_sessions WHERE status='done'").n,
      interviewCostUsd: one<{ c: number }>("SELECT COALESCE(SUM(costUsd),0) c FROM interview_sessions").c,
      applications: one<{ n: number }>("SELECT COUNT(*) n FROM applications").n,
      applicationsInterview: one<{ n: number }>("SELECT COUNT(*) n FROM applications WHERE interviewAt IS NOT NULL").n,
    },
    ai: { ...aiHealthSnapshot(), spentToday: spentToday(), budget: dailyBudget(), byFeature: spendByFeatureToday(), recentErrors: recentAiErrors() },
    config: { payments: paymentsConfig(), insights: insightsEnabled(), voice: ttsProvider(), sellerMissing: canSell() ? [] : missingSellerIdentity() },
    revenue: all<{ currency: string; total: number; count: number }>("SELECT currency, SUM(amount) total, COUNT(*) count FROM payments WHERE status='approved' GROUP BY currency"),
    byDay: all<{ day: string; generations: number; unlocks: number }>("SELECT substr(createdAt,1,10) day, COUNT(*) generations, SUM(unlocked) unlocks FROM generations GROUP BY day ORDER BY day DESC LIMIT 30"),
    users: all("SELECT id,email,name,credits,lang,createdAt,lastSeenAt,disabledAt FROM users WHERE role='user' ORDER BY createdAt DESC LIMIT 200"),
    recent: all("SELECT g.id,g.mode,g.source,g.lang,g.title,g.targetRole,g.matchBefore,g.matchAfter,g.unlocked,g.costUsd,g.createdAt,u.email FROM generations g LEFT JOIN users u ON u.id=g.userId ORDER BY g.createdAt DESC LIMIT 100"),
    payments: all("SELECT p.id,p.provider,p.pack,p.credits,p.amount,p.currency,p.status,p.createdAt,u.email FROM payments p LEFT JOIN users u ON u.id=p.userId ORDER BY p.createdAt DESC LIMIT 100"),
    onboarding: all("SELECT id,tourCompleted,tourStep,firstSeenAt,completedAt,events FROM onboarding ORDER BY firstSeenAt DESC LIMIT 100"),
    voiceBriefings: all("SELECT id,ownerId,lang,substr(transcript,1,300) transcript,createdAt FROM voice_briefings ORDER BY createdAt DESC LIMIT 50"),
    interviews: all("SELECT s.id,s.mode,s.status,s.lang,s.costUsd,s.createdAt,s.completedAt,json_array_length(s.questions) questions,json_array_length(s.turns) answered,g.title kitTitle,COALESCE(u.email,s.anonId) owner FROM interview_sessions s JOIN generations g ON g.id=s.generationId LEFT JOIN users u ON u.id=s.userId ORDER BY s.createdAt DESC LIMIT 100"),
  });
}
