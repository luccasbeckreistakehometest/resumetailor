"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { useAuth } from "@/components/AuthProvider";
import { Button, Input } from "@/components/ui";

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
    <div data-testid="voucher">
      <p className="eyebrow">{C.haveCode}</p>
      <div className="mt-[var(--s-3)] flex flex-wrap gap-[var(--s-3)]">
        <Input
          aria-label={C.codePh}
          placeholder={C.codePh}
          className="max-w-[260px] font-mono uppercase tracking-[0.04em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void redeem(); }}
          data-testid="voucher-code"
        />
        <Button variant="outline" onClick={() => void redeem()} loading={busy} disabled={busy || !code.trim()} data-testid="voucher-redeem">{busy ? C.redeeming : C.redeem}</Button>
      </div>
      {note && (
        <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)]" style={{ color: note.ok ? "var(--kept)" : "var(--mark)" }} role={note.ok ? "status" : "alert"} data-testid="voucher-note">{note.text}</p>
      )}
    </div>
  );
}

/** "Tem um código?" — on pricing and the account page; /resgatar/<code> arrives pre-filled. */
export function VoucherField() {
  // The anchor lives out here, not on the field: `Field` reads the query string, so Next leaves
  // that subtree out of the prerendered HTML and a browser following /pricing#code would land on
  // nothing. This wrapper is in the HTML from the first byte.
  return <div id="code"><Suspense fallback={null}><Field /></Suspense></div>;
}
