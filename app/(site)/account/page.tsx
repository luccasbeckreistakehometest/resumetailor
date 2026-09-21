"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VoucherField } from "@/components/VoucherField";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";

type Payment = { id: string; provider: string; pack: string; credits: number; amount: number; currency: string; status: string; createdAt: string };
type Account = { kits: number; termsAcceptedAt: string | null; payments: Payment[] };

const post = (url: string, body?: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

/** Profile, prepaid-credit plan, payments, password, sessions, and the LGPD self-service tools. */
export default function AccountPage() {
  const { l, x, lang } = useI18n();
  const A = l.account;
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Account | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ area: string; text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [del, setDel] = useState<{ open: boolean; confirm: string; password: string }>({ open: false, confirm: "", password: "" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/account", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled) setData(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const locale = lang === "pt" ? "pt-BR" : lang;
  const date = (v: string | null) => (v ? new Date(v).toLocaleDateString(locale) : "—");
  const money = (p: Payment) => new Intl.NumberFormat(locale, { style: "currency", currency: p.currency || "USD" }).format(p.amount);
  const fail = async (area: string, r: Response) => setMsg({ area, ok: false, text: apiErrorText(await r.json().catch(() => ({})), l, x.errors.generic) });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setBusy("pw"); setMsg(null);
    const r = await post("/api/account/password", pw);
    setBusy("");
    if (!r.ok) return fail("pw", r);
    setPw({ current: "", next: "" }); setMsg({ area: "pw", ok: true, text: A.saved });
    await refresh();
  }
  async function signOutAll() {
    setBusy("all");
    await post("/api/account/logout-all");
    setBusy(""); await refresh(); router.push("/");
  }
  async function download() {
    setBusy("dl"); setMsg(null);
    const r = await post("/api/account/export");
    setBusy("");
    if (!r.ok) return fail("data", r);
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url; a.download = `resumetailor-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function remove(e: React.FormEvent) {
    e.preventDefault(); setBusy("del"); setMsg(null);
    const r = await post("/api/account/delete", { confirm: del.confirm, password: del.password });
    setBusy("");
    if (!r.ok) return fail("del", r);
    try { localStorage.removeItem("rt_last_gen"); } catch {}
    setDeleted(true);
    await refresh();
  }

  const note = (area: string) => msg?.area === area ? <p className={"mt-3 text-sm " + (msg.ok ? "text-moss" : "text-oxblood")} role={msg.ok ? "status" : "alert"} data-testid={`account-msg-${area}`}>{msg.text}</p> : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-10)]">
        <Eyebrow>{A.eyebrow}</Eyebrow>
        <h1 className="doc-45 mt-[var(--s-3)] text-[color:var(--ink)]">{A.title}</h1>
        {deleted && <p className="mt-[var(--s-8)] border border-[var(--rule)] p-[var(--s-6)] text-[color:var(--ink)]" role="status" data-testid="account-deleted">{A.deleted} <Link href="/" className="font-medium text-[color:var(--ink)] underline underline-offset-[3px]">{l.errorPages.home}</Link></p>}
        {!loading && !user && !deleted && (
          <div className="mt-[var(--s-8)] border border-[var(--rule)] p-[var(--s-6)]">
            <p className="text-ink-2">{A.signInFirst}</p>
            <button className="btn btn-primary mt-4" onClick={() => setAuthOpen(true)}>{x.nav.signIn}</button>
          </div>
        )}
        {user && (
          <div className="mt-8 space-y-6" data-testid="account">
            {user.mustChangePassword && <p className="bg-[var(--query-wash)] px-[var(--s-5)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink)]" style={{ borderLeft: "2px solid var(--query)" }} role="status" data-testid="must-change">{l.auth.mustChange}</p>}

            <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" aria-labelledby="acc-profile">
              <h2 id="acc-profile" className="doc-21 text-[color:var(--ink)]">{A.profile}</h2>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-muted">{A.email}</dt><dd className="break-all text-ink" data-testid="account-email">{user.email}</dd>
                <dt className="text-muted">{A.name}</dt><dd className="text-ink">{user.name || "—"}</dd>
                <dt className="text-muted">{A.memberSince}</dt><dd className="text-ink">{date(user.createdAt)}</dd>
                <dt className="text-muted">{A.kits}</dt><dd className="text-ink">{data?.kits ?? "—"}</dd>
              </dl>
              {data?.termsAcceptedAt && <p className="mt-3 text-xs text-muted">{A.consentOn(date(data.termsAcceptedAt))} <Link href="/legal/terms" className="underline">{l.footer.terms}</Link> · <Link href="/legal/privacy" className="underline">{l.footer.privacy}</Link></p>}
            </section>

            <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" aria-labelledby="acc-plan">
              <h2 id="acc-plan" className="doc-21 text-[color:var(--ink)]">{A.plan}</h2>
              <p className="mt-2 text-sm text-ink-2" data-testid="account-plan">{A.planText(user.credits)}</p>
              <Link href="/pricing" className="btn btn-primary mt-4">{A.buy}</Link>
              <div className="mt-4"><VoucherField /></div>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">{A.payments}</h3>
              {data && data.payments.length === 0 && <p className="mt-2 text-sm text-muted">{A.noPayments}</p>}
              {data && data.payments.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <tbody>{data.payments.map((p) => (
                      <tr key={p.id} className="border-b border-edge/60">
                        <td className="py-2 pr-4 text-ink-2">{date(p.createdAt)}</td>
                        <td className="py-2 pr-4 text-ink">{x.credits.badge(p.credits)}</td>
                        <td className="py-2 pr-4 text-ink">{money(p)}</td>
                        <td className="py-2 text-ink-2">{A.paymentStatus[p.status] ?? p.status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" aria-labelledby="acc-sec">
              <h2 id="acc-sec" className="doc-21 text-[color:var(--ink)]">{A.security}</h2>
              <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:max-w-md">
                <p className="text-sm font-medium text-ink">{A.changePassword}</p>
                <label className="text-sm text-ink-2" htmlFor="acc-current">{A.current}</label>
                <input id="acc-current" className="field" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} data-testid="pw-current" />
                <label className="text-sm text-ink-2" htmlFor="acc-next">{A.next}</label>
                <input id="acc-next" className="field" type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} data-testid="pw-next" />
                <button className="btn btn-ink justify-self-start" disabled={busy === "pw"} data-testid="pw-save">{busy === "pw" ? A.working : A.save}</button>
              </form>
              {note("pw")}
              <div className="mt-6 border-t border-edge pt-5">
                <button onClick={() => void signOutAll()} disabled={busy === "all"} className="btn btn-ghost" data-testid="signout-all">{A.signOutAll}</button>
                <p className="mt-2 text-xs text-muted">{A.signOutAllHint}</p>
              </div>
            </section>

            <section className="border-t border-[var(--rule)] pt-[var(--s-5)]" aria-labelledby="acc-data">
              <h2 id="acc-data" className="doc-21 text-[color:var(--ink)]">{A.data}</h2>
              <p className="mt-2 text-sm text-ink-2">{A.dataHint}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={() => void download()} disabled={busy === "dl"} className="btn btn-ghost" data-testid="export-data">{busy === "dl" ? A.downloading : A.download}</button>
                {user.role !== "admin" && <button onClick={() => setDel({ ...del, open: true })} className="btn btn-mark" data-testid="delete-open">{A.delete}</button>}
              </div>
              {note("data")}
              {del.open && (
                <form onSubmit={remove} className="mt-[var(--s-5)] border border-[var(--mark)] p-[var(--s-5)]" data-testid="delete-form">
                  <p className="font-semibold text-ink">{A.deleteTitle}</p>
                  <p className="mt-1 text-sm text-ink-2">{A.deleteText}</p>
                  <label htmlFor="del-confirm" className="mt-3 block text-sm text-ink-2">{A.deleteConfirm}</label>
                  <input id="del-confirm" className="field mt-1" value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} autoComplete="off" data-testid="delete-confirm" />
                  <label htmlFor="del-password" className="mt-3 block text-sm text-ink-2">{A.deletePassword}</label>
                  <input id="del-password" className="field mt-1" type="password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} autoComplete="current-password" data-testid="delete-password" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className="btn btn-primary" disabled={busy === "del" || del.confirm.trim().toLowerCase() !== user.email} data-testid="delete-go">{busy === "del" ? A.working : A.deleteGo}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setDel({ open: false, confirm: "", password: "" })}>{A.cancel}</button>
                  </div>
                  {note("del")}
                </form>
              )}
            </section>
          </div>
        )}
      </Container>
      <SiteFooter />
      {authOpen && <AuthModal initialMode="in" onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
