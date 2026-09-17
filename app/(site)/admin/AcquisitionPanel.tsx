"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { allRoutes } from "@/lib/i18n/routes";
import type { AcquisitionReport } from "@/lib/server/analytics";

type Row = Record<string, unknown>;
const money = (list: Row[]) =>
  list.length ? list.map((m) => `${m.currency === "BRL" ? "R$" : "$"} ${Number(m.total).toFixed(2)}`).join(" · ") : "—";
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");

/** Visitors → preview → signup → unlock → purchase, by first touch, with a UTM link builder. */
export function AcquisitionPanel() {
  const { r } = useI18n();
  const A = r.acquisition;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AcquisitionReport | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/acquisition?days=${days}`, { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).then((j) => { if (alive) setData(j); }).catch(() => {});
    return () => { alive = false; };
  }, [days]);

  if (!data) return null;
  const k = data.kpis;
  const top = Math.max(1, ...data.funnel.map((f) => f.count));
  const maxDay = Math.max(1, ...data.daily.map((d) => Number(d.visitors)));
  const steps = (row: Row) => (["page_view", "preview_ready", "signup", "unlock", "purchase"] as const).map((st) => Number(row[st] ?? 0));

  return (
    <div className="space-y-6" data-testid="acquisition">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{A.period}:</span>
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" onClick={() => setDays(n)} className={"rounded-full border px-3 py-1 text-sm " + (days === n ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2")}>{A.days(n)}</button>
        ))}
        <span className="ml-auto text-xs text-muted">{A.tours(data.tours.started, data.tours.done)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([["visitors", k.visitors], ["previews", k.previews], ["signups", k.signups], ["unlocks", k.unlocks], ["payers", k.payers]] as const).map(([key, v]) => (
          <div key={key} className="card p-3" data-testid={`acq-kpi-${key}`}><p className="eyebrow">{A.kpi[key]}</p><p className="font-display text-2xl text-ink">{v}</p></div>
        ))}
        <div className="card p-3"><p className="eyebrow">{A.kpi.revenue}</p><p className="font-display text-lg text-moss">{money(k.revenue)}</p></div>
      </div>

      <div className="card p-4" data-testid="acq-funnel">
        {data.funnel.map((f, i) => (
          <div key={f.step} className="flex items-center gap-3 py-1 text-sm">
            <span className="w-28 shrink-0 text-ink-2">{A.steps[f.step]}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-paper-2"><div className="h-full bg-oxblood" style={{ width: `${(f.count / top) * 100}%` }} /></div>
            <span className="w-24 shrink-0 text-right font-semibold text-ink">{f.count}{i > 0 && <span className="ml-1 text-xs font-normal text-muted">{pct(f.count, data.funnel[i - 1].count)}</span>}</span>
          </div>
        ))}
        {k.visitors === 0 && <p className="mt-2 text-sm text-muted">{A.empty}</p>}
      </div>

      {data.daily.length > 0 && (
        <div className="card p-4">
          <p className="eyebrow">{A.daily}</p>
          <svg viewBox={`0 0 ${data.daily.length * 12} 60`} className="mt-2 h-16 w-full" preserveAspectRatio="none" role="img" aria-label={A.daily}>
            {data.daily.map((d, i) => <rect key={String(d.day)} x={i * 12 + 2} width="8" y={60 - (Number(d.visitors) / maxDay) * 56} height={(Number(d.visitors) / maxDay) * 56} fill="var(--oxblood)"><title>{`${d.day}: ${d.visitors} / ${d.previews} / ${d.signups}`}</title></rect>)}
          </svg>
        </div>
      )}

      <Table title={A.bySource} testId="acq-sources" head={[A.source, A.medium, A.campaign, ...Object.values(A.steps), A.kpi.revenue, A.cr]}
        rows={(data.bySource as Row[]).map((row) => { const st = steps(row); return [String(row.source), String(row.medium || "—"), String(row.campaign || "—"), ...st, money(row.revenue as Row[]), pct(st[4], st[0])]; })} />
      <Table title={A.byLanding} testId="acq-landing" head={[A.landing, ...Object.values(A.steps)]} rows={data.byLanding.map((row) => [String(row.landing), ...steps(row)])} />
      <Table title={A.byLang} testId="acq-lang" head={[A.lang, ...Object.values(A.steps)]} rows={data.byLang.map((row) => [String(row.lang), ...steps(row)])} />
      <UtmBuilder />
      <p className="text-xs text-muted">{A.note}</p>
    </div>
  );
}

function Table({ title, head, rows, testId }: { title: string; head: string[]; rows: (string | number | null)[][]; testId: string }) {
  return (
    <div className="card overflow-x-auto p-4">
      <p className="eyebrow">{title}</p>
      <table className="mt-2 w-full text-left text-sm" data-testid={testId}>
        <thead><tr className="border-b border-edge text-xs uppercase tracking-wide text-muted">{head.map((h) => <th key={h} className="py-1.5 pr-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-edge/60" data-testid={`${testId}-row`}>{row.map((c, j) => <td key={j} className="py-1.5 pr-3 text-ink-2">{c ?? "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function UtmBuilder() {
  const { r } = useI18n();
  const A = r.acquisition;
  const paths = allRoutes().flatMap((x) => Object.values(x.paths)).filter((p): p is string => !!p);
  const [base, setBase] = useState(paths[0] ?? "/");
  const [source, setSource] = useState("meta"); const [medium, setMedium] = useState("paid"); const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);
  const q = new URLSearchParams({ utm_source: source.trim().toLowerCase(), utm_medium: medium.trim().toLowerCase(), ...(campaign.trim() ? { utm_campaign: campaign.trim().toLowerCase().replace(/\s+/g, "_") } : {}) });
  const url = `${typeof window === "undefined" ? "" : window.location.origin}${base}?${q.toString()}`;
  return (
    <div className="card p-4" data-testid="utm-builder">
      <p className="eyebrow">{A.builder}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <select aria-label={A.base} className="field" value={base} onChange={(e) => setBase(e.target.value)}>{paths.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <input aria-label={A.source} className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="meta" />
        <input aria-label={A.medium} className="field" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="paid" />
        <input aria-label={A.campaign} className="field" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="br_firstjob" data-testid="utm-campaign" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-paper px-2 py-1 text-xs text-ink" data-testid="utm-url">{url}</code>
        <button type="button" className="btn btn-ink !py-1.5 !text-sm" onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? A.copied : A.copy}</button>
      </div>
    </div>
  );
}
