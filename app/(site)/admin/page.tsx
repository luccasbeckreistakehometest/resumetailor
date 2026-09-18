"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Button, Container, Input, Select, Tabs } from "@/components/ui";
import { AiPanel, Messages, UserLookup, type AiInfo } from "./AdminTools";
import { AcquisitionPanel } from "./AcquisitionPanel";
import { VouchersPanel } from "./VouchersPanel";

type Row = Record<string, string | number | null>;
type Overview = {
  totals: Record<string, number>; revenue: { currency: string; total: number; count: number }[];
  byDay: { day: string; generations: number; unlocks: number }[]; users: Row[]; recent: Row[]; payments: Row[];
  onboarding: (Row & { events: string })[]; voiceBriefings: Row[]; interviews: Row[];
  ai: AiInfo; config: { payments: { stripe: boolean; mercadopago: boolean }; insights: boolean; voice: string | null; sellerMissing: string[] };
};

export default function AdminPage() {
  const { x, l, r, lang } = useI18n();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [grant, setGrant] = useState<{ userId: string; delta: string }>({ userId: "", delta: "1" });
  const [tab, setTab] = useState<"recent" | "acquisition" | "codes" | "users" | "payments" | "onboarding" | "voice" | "interviews" | "messages">("recent");

  const load = () => fetch("/api/admin/overview", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then(setData);
  useEffect(() => { if (user?.role === "admin") void load(); }, [user]);

  if (loading) return null;
  if (user?.role !== "admin") return <div className="min-h-screen"><SiteHeader /><Container className="py-[var(--s-12)]"><p className="doc-21 text-[color:var(--ink-2)]">{x.admin.forbidden}</p></Container></div>;

  const fmtDate = (v: unknown) => v ? new Date(String(v)).toLocaleString(lang === "pt" ? "pt-BR" : lang) : "—";
  async function doGrant() {
    await fetch("/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: grant.userId, delta: Number(grant.delta) }) });
    void load();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-[var(--s-9)]">
        {/* Density is a decision: the admin is a tool, so it runs compact. */}
        <div data-density="compact">
        <p className="eyebrow">ResumeTailor</p>
        <h1 className="doc-31 mt-[var(--s-2)] text-[color:var(--ink)]">{x.admin.title}</h1>
        {data && (
          <>
            {/* Eight stat cards became one figures table: same numbers, one alignment, no boxes. */}
            <table className="mt-[var(--s-7)] w-full border-collapse text-left" data-testid="admin-totals">
              <tbody>
                {[[x.admin.users, data.totals.users], [x.admin.generations, data.totals.generations], [x.admin.unlocked, data.totals.unlocked], [x.admin.voice, data.totals.voice],
                  [x.admin.interviews, `${data.totals.interviewsDone}/${data.totals.interviews}`], [x.admin.applications, `${data.totals.applicationsInterview}/${data.totals.applications}`],
                  [x.admin.tours, `${data.totals.toursCompleted}/${data.totals.toursStarted}`], [x.admin.aiCost, `$${Math.max(data.totals.aiSpendAllTime, data.totals.aiCostUsd + data.totals.interviewCostUsd).toFixed(2)}`]].map(([k, v]) => (
                  <tr key={String(k)} className="border-b border-[var(--rule-hairline)]">
                    <th scope="row" className="w-[60%] py-[var(--cell-y)] font-sans text-[length:var(--ui-13)] font-normal text-[color:var(--ink-muted)]">{k}</th>
                    <td className="py-[var(--cell-y)] text-right font-mono text-[length:var(--mn-15)] font-medium tabular-nums text-[color:var(--ink)]">{v}</td>
                  </tr>
                ))}
                {data.revenue.map((r) => (
                  <tr key={r.currency} className="border-b border-[var(--rule-hairline)]">
                    <th scope="row" className="py-[var(--cell-y)] font-sans text-[length:var(--ui-13)] font-normal text-[color:var(--ink-muted)]">{x.admin.revenue} · {r.currency} <span className="font-mono tabular-nums">({r.count})</span></th>
                    <td className="py-[var(--cell-y)] text-right font-serif text-[length:var(--doc-21)] font-semibold text-[color:var(--ink)]">{r.currency === "BRL" ? "R$ " : "$"}{r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AiPanel ai={data.ai} config={data.config} />
            <UserLookup onChanged={() => void load()} />

            <div className="mt-[var(--s-8)] border-t border-[var(--rule)] pt-[var(--s-5)]">
              <p className="eyebrow">{x.admin.grant} {x.admin.credits.toLowerCase()}</p>
              <div className="mt-[var(--s-4)] flex flex-wrap gap-[var(--s-3)]">
                <Select className="max-w-[320px]" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} aria-label={x.admin.users}>
                  <option value="">—</option>
                  {data.users.map((u) => <option key={String(u.id)} value={String(u.id)}>{String(u.email)} ({u.credits})</option>)}
                </Select>
                <Input className="w-[88px] text-right font-mono tabular-nums" type="number" value={grant.delta} onChange={(e) => setGrant({ ...grant, delta: e.target.value })} aria-label={x.admin.credits} />
                <Button size="sm" onClick={doGrant} disabled={!grant.userId}>{x.admin.grant}</Button>
              </div>
            </div>

            <div className="mt-[var(--s-8)] overflow-x-auto">
              <Tabs
                value={tab}
                onChange={(t) => setTab(t as typeof tab)}
                tabs={(["recent", "acquisition", "codes", "users", "payments", "onboarding", "voice", "interviews", "messages"] as const).map((t) => ({
                  id: t,
                  testId: `admin-tab-${t}`,
                  label: { recent: x.admin.recent, acquisition: r.acquisition.tab, codes: r.codes.admin.tab, users: x.admin.users, payments: x.admin.payments, onboarding: x.admin.onboarding, voice: x.admin.voice, interviews: x.admin.interviews, messages: `${l.admin.messages}${data.totals.messagesNew ? ` (${data.totals.messagesNew})` : ""}` }[t],
                }))}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              {tab === "recent" && <Table cols={[x.admin.when, x.admin.email, x.admin.mode, "Src", x.admin.match, x.admin.status, x.admin.aiCost]} rows={data.recent.map((r) => [fmtDate(r.createdAt), r.email ?? "anon", r.mode, r.source, `${r.matchBefore}→${r.matchAfter}`, r.unlocked ? "✓" : "—", `$${Number(r.costUsd).toFixed(3)}`])} />}
              {tab === "users" && <Table cols={[x.admin.when, x.admin.email, l.account.name, x.admin.credits, "Lang", l.admin.lastSeen, x.admin.status]} rows={data.users.map((u) => [fmtDate(u.createdAt), u.email, u.name, u.credits, u.lang, fmtDate(u.lastSeenAt), u.disabledAt ? l.admin.disabled : l.admin.active])} />}
              {tab === "payments" && <Table cols={[x.admin.when, x.admin.email, x.admin.provider, "Pack", x.admin.credits, x.admin.amount, x.admin.status]} rows={data.payments.map((p) => [fmtDate(p.createdAt), p.email, p.provider, p.pack, p.credits, `${p.currency} ${Number(p.amount).toFixed(2)}`, p.status])} />}
              {tab === "onboarding" && <Table cols={["Owner", "Tour", "Step", "First seen", x.admin.events]} rows={data.onboarding.map((o) => [String(o.id).slice(0, 18), o.tourCompleted ? "✓" : "—", o.tourStep, fmtDate(o.firstSeenAt), (JSON.parse(o.events) as { type: string }[]).map((e) => e.type).join(" → ")])} />}
              {tab === "voice" && <Table cols={[x.admin.when, "Owner", "Lang", "Transcript"]} rows={data.voiceBriefings.map((v) => [fmtDate(v.createdAt), String(v.ownerId).slice(0, 18), v.lang, v.transcript])} />}
              {tab === "messages" && <Messages />}
              {tab === "acquisition" && <AcquisitionPanel />}
              {tab === "codes" && <VouchersPanel />}
              {tab === "interviews" && <Table cols={[x.admin.when, "Owner", "Kit", x.admin.mode, x.admin.status, "Q", "Lang", x.admin.aiCost]} rows={data.interviews.map((s) => [fmtDate(s.createdAt), s.owner, s.kitTitle, s.mode, s.status, `${s.answered}/${s.questions}`, s.lang, `$${Number(s.costUsd).toFixed(3)}`])} />}
            </div>
          </>
        )}
        </div>
      </Container>
    </div>
  );
}

/**
 * The admin's own table. It stays local rather than using the system's <Table>, because these
 * rows are heterogeneous arrays rather than typed records — but it follows the same rules: a rule
 * under the header, hairlines between rows, zebra above twelve rows, figures aligned right in the
 * machine's face, and a cell that truncates rather than growing the row.
 */
const isNumeric = (v: unknown) => typeof v === "number" || (typeof v === "string" && /^[-+$R]*\s?[\d.,/→%]+$/.test(v.trim()));
const Table = ({ cols, rows }: { cols: string[]; rows: (string | number | null | undefined)[][] }) => (
  <table className="w-full border-collapse text-left" data-testid="admin-table">
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c} className="border-b border-[var(--rule)] py-[var(--cell-y)] pr-[var(--cell-x)] font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-muted)] whitespace-nowrap">{c}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} className={"border-b border-[var(--rule-hairline)] " + (rows.length > 12 && i % 2 === 1 ? "bg-[var(--zebra)]" : "")}>
          {r.map((c, j) => (
            <td
              key={j}
              title={c == null ? undefined : String(c)}
              className={"max-w-[320px] truncate py-[var(--cell-y)] pr-[var(--cell-x)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)] " + (isNumeric(c) ? "text-right font-mono tabular-nums text-[color:var(--ink)]" : "")}
            >
              {c ?? "—"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
