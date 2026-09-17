"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { VoucherRow } from "@/lib/server/vouchers";

type Redemption = { code: string; createdAt: string; email: string | null; campaign: string; credits: number };
const send = (url: string, method: string, body: unknown) => fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Admin: create a code or a batch for a partner (CSV), disable codes, see redemptions. */
export function VouchersPanel() {
  const { r, lang } = useI18n();
  const A = r.codes.admin;
  const [list, setList] = useState<VoucherRow[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [form, setForm] = useState({ code: "", credits: "1", uses: "1", count: "10", campaign: "", note: "", expires: "" });
  const [note, setNote] = useState("");
  const [csv, setCsv] = useState<string | null>(null);

  const load = useCallback(() => fetch("/api/admin/vouchers", { cache: "no-store" }).then((res) => res.json()).then((j) => { setList(j.vouchers ?? []); setRedemptions(j.redemptions ?? []); }), []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    const res = await send("/api/admin/vouchers", "POST", {
      mode, code: form.code || undefined, credits: Number(form.credits), maxRedemptions: Number(form.uses), count: Number(form.count),
      campaign: form.campaign, note: form.note, expiresAt: form.expires ? `${form.expires}T23:59:59Z` : null,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setNote(j.error ?? "error"); return; }
    const created = j.created as VoucherRow[];
    setNote(A.created(created.length));
    if (mode === "batch") {
      const rows = [["code", "credits", "campaign", "expiresAt"], ...created.map((v) => [v.code, String(v.credits), v.campaign, v.expiresAt ?? ""])];
      setCsv(URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n") + "\n"], { type: "text/csv" })));
    }
    await load();
  }
  async function toggle(v: VoucherRow) { await send(`/api/admin/vouchers/${v.code}`, "PATCH", { disabled: !v.disabled }); await load(); }
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang) : "—");
  const input = (k: keyof typeof form, label: string, type = "text") => (
    <label className="block text-xs text-muted">{label}<input type={type} className="field mt-1 !py-1.5 !text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`voucher-admin-${k}`} /></label>
  );

  return (
    <div className="space-y-5" data-testid="vouchers-admin">
      <div className="card p-4">
        <div className="flex gap-2">
          {(["single", "batch"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={"rounded-full border px-3 py-1 text-sm " + (mode === m ? "border-ink bg-ink text-paper" : "border-edge-2 text-ink-2")} data-testid={`voucher-mode-${m}`}>{m === "single" ? A.single : A.batch}</button>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {mode === "single" ? <>{input("code", A.code)}{input("uses", A.uses, "number")}</> : input("count", A.count, "number")}
          {input("credits", A.credits, "number")}{input("campaign", A.campaign)}{input("note", A.note)}{input("expires", A.expires, "date")}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void create()} className="btn btn-ink !py-1.5 !text-sm" data-testid="voucher-create">{A.create}</button>
          {csv && mode === "batch" && <a href={csv} download={`codes-${form.campaign || "batch"}.csv`} className="text-sm font-semibold text-oxblood" data-testid="voucher-csv">⬇ {A.csv}</a>}
          {note && <span className="text-sm text-moss" role="status">{note}</span>}
        </div>
      </div>
      <div className="card overflow-x-auto p-4">
        {list.length === 0 ? <p className="text-sm text-muted">{A.empty}</p> : (
          <table className="w-full text-left text-sm" data-testid="voucher-table">
            <thead><tr className="border-b border-edge text-xs uppercase text-muted">{[A.cols.code, A.cols.credits, A.cols.used, A.cols.campaign, A.cols.expires, A.cols.status, ""].map((h, i) => <th key={i} className="py-1.5 pr-3">{h}</th>)}</tr></thead>
            <tbody>{list.map((v) => (
              <tr key={v.code} className="border-b border-edge/60" data-testid="voucher-row">
                <td className="py-1.5 pr-3 font-mono">{v.code}</td><td className="pr-3">{v.credits}</td><td className="pr-3">{v.redeemed}/{v.maxRedemptions}</td>
                <td className="pr-3">{v.campaign || "—"}</td><td className="pr-3">{fmt(v.expiresAt)}</td><td className="pr-3">{v.disabled ? A.off : A.active}</td>
                <td><button type="button" onClick={() => void toggle(v)} className="text-xs text-oxblood">{v.disabled ? A.enable : A.disable}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className="card overflow-x-auto p-4">
        <p className="eyebrow">{A.redemptions}</p>
        <table className="mt-2 w-full text-left text-sm" data-testid="redemption-table">
          <tbody>{redemptions.map((x, i) => <tr key={i} className="border-b border-edge/60"><td className="py-1.5 pr-3">{fmt(x.createdAt)}</td><td className="pr-3 font-mono">{x.code}</td><td className="pr-3">{x.email ?? "—"}</td><td className="pr-3">{x.campaign || "—"}</td><td>+{x.credits}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
