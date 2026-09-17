"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { useAuth } from "@/components/AuthProvider";

function Field() {
  const { r, l, x } = useI18n();
  const C = r.codes;
  const { user, refresh } = useAuth();
  const params = useSearchParams();
  const [code, setCode] = useState(() => params.get("code") ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function redeem() {
    if (!code.trim()) return;
    if (!user) { setNote({ ok: false, text: C.signIn }); window.dispatchEvent(new CustomEvent("rt:auth", { detail: "up" })); return; }
    setBusy(true); setNote(null);
    const res = await fetch("/api/vouchers/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNote({ ok: false, text: apiErrorText(j, l, x.errors.generic) }); return; }
    setNote({ ok: true, text: C.redeemed(j.credits) }); setCode("");
    await refresh();
  }
  return (
    <div id="code" className="rounded-xl border border-dashed border-edge-2 bg-paper p-4" data-testid="voucher">
      <p className="text-sm font-semibold text-ink">🎟 {C.haveCode}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input aria-label={C.codePh} placeholder={C.codePh} className="field max-w-xs !py-2 uppercase" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void redeem(); }} data-testid="voucher-code" />
        <button type="button" onClick={() => void redeem()} disabled={busy || !code.trim()} className="btn btn-ink !py-2 !text-sm" data-testid="voucher-redeem">{busy ? C.redeeming : C.redeem}</button>
      </div>
      {note && <p className={"mt-2 text-sm " + (note.ok ? "text-moss" : "text-oxblood")} role={note.ok ? "status" : "alert"} data-testid="voucher-note">{note.text}</p>}
    </div>
  );
}

/** "Tem um código?" — on pricing and the account page; /resgatar/<code> arrives pre-filled. */
export function VoucherField() {
  return <Suspense fallback={null}><Field /></Suspense>;
}
