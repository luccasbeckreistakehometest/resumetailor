"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";

type Row = Record<string, string | number | null>;
type Detail = {
  user: Row & { mustChangePassword: boolean };
  ledger: Row[]; payments: Row[]; kits: Row[];
  publicResumes: { slug: string; enabled: number; takenDownAt: string | null; views: number; updatedAt: string }[];
};
export type AiInfo = {
  ready: boolean; spentToday: number; budget: number;
  probe: { ok: boolean; reason: string | null; checkedAt: number } | null;
  lastFailure: { at: number; kind: string; detail: string } | null;
  byFeature: { feature: string; calls: number; costUsd: number }[];
  recentErrors: { feature: string; error: string | null; ip: string | null; createdAt: string }[];
};

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }));

/** AI health, today's spend against the ceiling, and the last failures (operator detail lives here, not in the UI). */
export function AiPanel({ ai, config }: { ai: AiInfo; config: { payments: { stripe: boolean; mercadopago: boolean }; insights: boolean; voice: string | null } }) {
  const { l } = useI18n();
  const A = l.admin;
  const pct = ai.budget > 0 ? Math.min(100, (ai.spentToday / ai.budget) * 100) : 100;
  return (
    <div className="card mt-6 p-5" data-testid="admin-ai">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">{A.ai}</p>
        <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (ai.ready ? "bg-moss-2 text-moss" : "bg-gold-2 text-oxblood")} data-testid="admin-ai-status">{ai.ready ? A.aiReady : A.aiDown}</span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted">{A.spentToday}</p><p className="font-display text-2xl text-ink" data-testid="admin-spend">${ai.spentToday.toFixed(2)}</p></div>
        <div><p className="text-xs text-muted">{A.budget} (AI_DAILY_BUDGET_USD)</p><p className="font-display text-2xl text-ink">${ai.budget.toFixed(2)}</p></div>
        <div><p className="text-xs text-muted">{A.configured}</p><p className="text-sm text-ink-2">Stripe {config.payments.stripe ? A.yes : A.no} · Mercado Pago {config.payments.mercadopago ? A.yes : A.no} · Tavily {config.insights ? A.yes : A.no} · TTS {config.voice ?? A.no}</p></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-oxblood" style={{ width: `${pct}%` }} /></div>
      {ai.probe && <p className="mt-3 text-xs text-muted">{A.probe}: {ai.probe.ok ? "OK" : ai.probe.reason} · {new Date(ai.probe.checkedAt).toLocaleString()}</p>}
      {ai.lastFailure && <p className="mt-1 text-xs text-oxblood">{A.lastFailure}: {ai.lastFailure.kind} — {ai.lastFailure.detail} · {new Date(ai.lastFailure.at).toLocaleString()}</p>}
      {ai.byFeature.length > 0 && <p className="mt-3 text-xs text-ink-2">{A.byFeature}: {ai.byFeature.map((f) => `${f.feature} ${f.calls}× $${f.costUsd.toFixed(3)}`).join(" · ")}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">{A.recentErrors} ({ai.recentErrors.length})</summary>
        {ai.recentErrors.length === 0 ? <p className="mt-2 text-sm text-muted">{A.noErrors}</p> : (
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs text-ink-2">{ai.recentErrors.map((e, i) => <li key={i}><span className="text-muted">{new Date(e.createdAt).toLocaleString()}</span> · {e.feature} · {e.error}</li>)}</ul>
        )}
      </details>
    </div>
  );
}

/** Find a user, see plan/credits/payments/kits, and act: reset password, disable, sign out, take down pages. */
export function UserLookup({ onChanged }: { onChanged: () => void }) {
  const { l, x } = useI18n();
  const A = l.admin;
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const search = async (query: string) => {
    const r = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (r.ok) setItems((await r.json()).items);
  };
  const load = async (id: string) => {
    const r = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
    if (r.ok) setDetail(await r.json());
  };
  useEffect(() => { void fetch("/api/admin/users", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] })).then((j) => setItems(j.items)); }, []);

  async function act(action: "reset_password" | "disable" | "enable" | "logout_all") {
    if (!open) return;
    if (action === "reset_password" && !window.confirm(A.confirmReset)) return;
    if (action === "disable" && !window.confirm(A.confirmDisable)) return;
    const { ok, j } = await send(`/api/admin/users/${open}`, "POST", { action });
    setNote(ok ? "✓" : String(j.error ?? "error"));
    if (ok && j.temporaryPassword) setTemp(j.temporaryPassword);
    await load(open); onChanged();
  }
  async function takedown(slug: string, down: boolean) {
    const { ok } = await send(`/api/admin/public/${slug}`, "POST", { down });
    setNote(ok ? "✓" : "error");
    if (open) await load(open);
  }

  return (
    <div className="card mt-6 p-5" data-testid="admin-lookup">
      <p className="eyebrow">{A.lookup}</p>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void search(q); }}>
        <label htmlFor="admin-q" className="sr-only">{A.lookup}</label>
        <input id="admin-q" className="field max-w-xs" placeholder={A.lookupPh} value={q} onChange={(e) => setQ(e.target.value)} data-testid="admin-q" />
        <button className="btn btn-ink" data-testid="admin-search">{A.search}</button>
      </form>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>{items.map((u) => (
            <tr key={String(u.id)} className="border-b border-edge/60">
              <td className="py-2 pr-3 text-ink">{u.email}</td>
              <td className="py-2 pr-3 text-ink-2">{x.credits.badge(Number(u.credits))}</td>
              <td className="py-2 pr-3 text-ink-2">{u.disabledAt ? A.disabled : A.active}</td>
              <td className="py-2 text-right"><button className="text-sm font-medium text-oxblood underline" onClick={() => { setOpen(String(u.id)); setTemp(null); setNote(""); void load(String(u.id)); }} data-testid={`admin-open-${u.email}`}>{A.open}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {open && detail && (
        <div className="mt-5 rounded-xl border border-edge bg-paper p-4" data-testid="admin-user">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{detail.user.email}</p>
              <p className="text-sm text-ink-2">{A.plan}: {x.credits.badge(Number(detail.user.credits))} · {detail.user.disabledAt ? A.disabled : A.active} · {A.lastSeen}: {detail.user.lastSeenAt ? new Date(String(detail.user.lastSeenAt)).toLocaleString() : "—"}</p>
            </div>
            <button className="text-sm text-muted" onClick={() => { setOpen(null); setDetail(null); setTemp(null); }}>{A.close}</button>
          </div>
          {detail.user.role !== "admin" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => void act("reset_password")} data-testid="admin-reset">{A.resetPassword}</button>
              {detail.user.disabledAt
                ? <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => void act("enable")} data-testid="admin-enable">{A.enable}</button>
                : <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => void act("disable")} data-testid="admin-disable">{A.disable}</button>}
              <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => void act("logout_all")}>{A.signOutAll}</button>
            </div>
          )}
          {note && <p className="mt-2 text-xs text-muted" role="status">{note}</p>}
          {temp && <p className="mt-3 rounded-lg bg-gold-2 p-3 text-sm text-ink" data-testid="admin-temp">{A.tempPassword} <code className="select-all font-mono text-base font-semibold" data-testid="admin-temp-value">{temp}</code></p>}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{A.publicPages}</p>
          <ul className="mt-1 space-y-1 text-sm">{detail.publicResumes.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center gap-2" data-testid={`admin-page-${p.slug}`}>
              <a className="text-ink underline" href={`/cv/${p.slug}`} target="_blank" rel="noreferrer">/cv/{p.slug}</a>
              <span className="text-muted">{p.takenDownAt ? A.takenDown : p.enabled ? A.live : A.off} · {p.views}</span>
              <button className="text-xs font-medium text-oxblood underline" onClick={() => void takedown(p.slug, !p.takenDownAt)} data-testid={`admin-takedown-${p.slug}`}>{p.takenDownAt ? A.restore : A.takeDown}</button>
            </li>
          ))}</ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{l.account.payments}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">{detail.payments.map((p) => <li key={String(p.id)}>{String(p.createdAt).slice(0, 16)} · {p.provider} · {p.currency} {Number(p.amount).toFixed(2)} · {p.credits} · {p.status}</li>)}</ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{A.ledger}</p>
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-ink-2">{detail.ledger.map((e, i) => <li key={i}>{String(e.createdAt).slice(0, 16)} · {Number(e.delta) > 0 ? "+" : ""}{e.delta} · {e.reason} → {e.balanceAfter}</li>)}</ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{A.kits} ({detail.kits.length})</p>
        </div>
      )}
    </div>
  );
}

/** Contact-form inbox with a status per message. */
export function Messages() {
  const { l } = useI18n();
  const A = l.admin;
  const [items, setItems] = useState<Row[]>([]);
  const load = () => fetch("/api/admin/messages", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [] })).then((j) => setItems(j.items));
  useEffect(() => { void load(); }, []);
  async function setStatus(id: string, status: string) {
    await send(`/api/admin/messages/${id}`, "PATCH", { status });
    void load();
  }
  if (!items.length) return <p className="text-sm text-muted">{A.noMessages}</p>;
  return (
    <ul className="space-y-3" data-testid="admin-messages">
      {items.map((m) => (
        <li key={String(m.id)} className="rounded-xl border border-edge bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink"><strong>{m.email}</strong>{m.name ? ` · ${m.name}` : ""} · {A.topic}: {m.topic} · {String(m.lang)}</p>
            <label className="text-xs text-muted">
              <span className="sr-only">Status</span>
              <select className="rounded border border-edge-2 bg-paper px-2 py-1 text-xs" value={String(m.status)} onChange={(e) => void setStatus(String(m.id), e.target.value)} data-testid={`admin-msg-status-${m.id}`}>
                {["new", "open", "done"].map((s) => <option key={s} value={s}>{A.status[s]}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{m.message}</p>
          <p className="mt-2 text-xs text-muted">{new Date(String(m.createdAt)).toLocaleString()} · <a className="underline" href={`mailto:${m.email}`}>{A.from}: {m.email}</a></p>
        </li>
      ))}
    </ul>
  );
}
