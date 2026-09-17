"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";
import { AiPanel, Messages, UserLookup, type AiInfo } from "./AdminTools";

type Row = Record<string, string | number | null>;
type Overview = {
  totals: Record<string, number>; revenue: { currency: string; total: number; count: number }[];
  byDay: { day: string; generations: number; unlocks: number }[]; users: Row[]; recent: Row[]; payments: Row[];
  onboarding: (Row & { events: string })[]; voiceBriefings: Row[]; interviews: Row[];
  ai: AiInfo; config: { payments: { stripe: boolean; mercadopago: boolean }; insights: boolean; voice: string | null; sellerMissing: string[] };
};

export default function AdminPage() {
  const { x, l, lang } = useI18n();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [grant, setGrant] = useState<{ userId: string; delta: string }>({ userId: "", delta: "1" });
  const [tab, setTab] = useState<"recent" | "users" | "payments" | "onboarding" | "voice" | "interviews" | "messages">("recent");

  const load = () => fetch("/api/admin/overview", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then(setData);
  useEffect(() => { if (user?.role === "admin") void load(); }, [user]);

  if (loading) return null;
  if (user?.role !== "admin") return <div className="min-h-screen"><SiteHeader /><Container className="py-20 text-center text-ink-2">{x.admin.forbidden}</Container></div>;

  const fmtDate = (v: unknown) => v ? new Date(String(v)).toLocaleString(lang === "pt" ? "pt-BR" : lang) : "—";
  async function doGrant() {
    await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: grant.userId, delta: Number(grant.delta) }) });
    void load();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-10">
        <Eyebrow>ResumeTailor</Eyebrow>
        <h1 className="font-display mt-2 text-4xl text-ink">{x.admin.title}</h1>
        {data && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="admin-totals">
              {[[x.admin.users, data.totals.users], [x.admin.generations, data.totals.generations], [x.admin.unlocked, data.totals.unlocked], [x.admin.voice, data.totals.voice],
                [x.admin.interviews, `${data.totals.interviewsDone}/${data.totals.interviews}`], [x.admin.applications, `${data.totals.applicationsInterview}/${data.totals.applications}`],
                [x.admin.tours, `${data.totals.toursCompleted}/${data.totals.toursStarted}`], [x.admin.aiCost, `$${Math.max(data.totals.aiSpendAllTime, data.totals.aiCostUsd + data.totals.interviewCostUsd).toFixed(2)}`]].map(([k, v]) => (
                <div key={String(k)} className="card p-4"><p className="eyebrow">{k}</p><p className="font-display mt-1 text-3xl text-ink">{v}</p></div>
              ))}
            </div>
            <AiPanel ai={data.ai} config={data.config} />
            <UserLookup onChanged={() => void load()} />
            <div className="mt-4 flex flex-wrap gap-4">
              {data.revenue.map((r) => <div key={r.currency} className="card px-5 py-3"><p className="eyebrow">{x.admin.revenue} · {r.currency}</p><p className="font-display text-2xl text-moss">{r.currency === "BRL" ? "R$ " : "$"}{r.total.toFixed(2)} <span className="text-sm text-muted">({r.count})</span></p></div>)}
            </div>

            <div className="card mt-8 p-5">
              <p className="eyebrow">{x.admin.grant} {x.admin.credits.toLowerCase()}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <select className="field max-w-xs" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })}>
                  <option value="">—</option>
                  {data.users.map((u) => <option key={String(u.id)} value={String(u.id)}>{String(u.email)} ({u.credits})</option>)}
                </select>
                <input className="field w-24" type="number" value={grant.delta} onChange={(e) => setGrant({ ...grant, delta: e.target.value })} />
                <button onClick={doGrant} disabled={!grant.userId} className="btn btn-ink">{x.admin.grant}</button>
              </div>
            </div>

            <div className="mt-8 flex gap-2 overflow-x-auto border-b border-edge">
              {(["recent", "users", "payments", "onboarding", "voice", "interviews", "messages"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={"px-3 py-2 text-sm font-medium " + (tab === t ? "border-b-2 border-ink text-ink" : "text-muted")}>
                  {{ recent: x.admin.recent, users: x.admin.users, payments: x.admin.payments, onboarding: x.admin.onboarding, voice: x.admin.voice, interviews: x.admin.interviews, messages: `${l.admin.messages}${data.totals.messagesNew ? ` (${data.totals.messagesNew})` : ""}` }[t]}
                </button>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              {tab === "recent" && <Table cols={[x.admin.when, x.admin.email, x.admin.mode, "Src", x.admin.match, x.admin.status, x.admin.aiCost]} rows={data.recent.map((r) => [fmtDate(r.createdAt), r.email ?? "anon", r.mode, r.source, `${r.matchBefore}→${r.matchAfter}`, r.unlocked ? "✓" : "—", `$${Number(r.costUsd).toFixed(3)}`])} />}
              {tab === "users" && <Table cols={[x.admin.when, x.admin.email, l.account.name, x.admin.credits, "Lang", l.admin.lastSeen, x.admin.status]} rows={data.users.map((u) => [fmtDate(u.createdAt), u.email, u.name, u.credits, u.lang, fmtDate(u.lastSeenAt), u.disabledAt ? l.admin.disabled : l.admin.active])} />}
              {tab === "payments" && <Table cols={[x.admin.when, x.admin.email, x.admin.provider, "Pack", x.admin.credits, x.admin.amount, x.admin.status]} rows={data.payments.map((p) => [fmtDate(p.createdAt), p.email, p.provider, p.pack, p.credits, `${p.currency} ${Number(p.amount).toFixed(2)}`, p.status])} />}
              {tab === "onboarding" && <Table cols={["Owner", "Tour", "Step", "First seen", x.admin.events]} rows={data.onboarding.map((o) => [String(o.id).slice(0, 18), o.tourCompleted ? "✓" : "—", o.tourStep, fmtDate(o.firstSeenAt), (JSON.parse(o.events) as { type: string }[]).map((e) => e.type).join(" → ")])} />}
              {tab === "voice" && <Table cols={[x.admin.when, "Owner", "Lang", "Transcript"]} rows={data.voiceBriefings.map((v) => [fmtDate(v.createdAt), String(v.ownerId).slice(0, 18), v.lang, v.transcript])} />}
              {tab === "messages" && <Messages />}
              {tab === "interviews" && <Table cols={[x.admin.when, "Owner", "Kit", x.admin.mode, x.admin.status, "Q", "Lang", x.admin.aiCost]} rows={data.interviews.map((s) => [fmtDate(s.createdAt), s.owner, s.kitTitle, s.mode, s.status, `${s.answered}/${s.questions}`, s.lang, `$${Number(s.costUsd).toFixed(3)}`])} />}
            </div>
          </>
        )}
      </Container>
    </div>
  );
}

const Table = ({ cols, rows }: { cols: string[]; rows: (string | number | null | undefined)[][] }) => (
  <table className="w-full text-left text-sm" data-testid="admin-table">
    <thead><tr className="border-b border-edge text-xs uppercase tracking-wide text-muted">{cols.map((c) => <th key={c} className="py-2 pr-4 font-semibold">{c}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-edge/60">{r.map((c, j) => <td key={j} className="max-w-md truncate py-2 pr-4 text-ink-2">{c ?? "—"}</td>)}</tr>)}</tbody>
  </table>
);
