"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { Container } from "@/components/ui";

type Status = "checking" | "paid" | "pending" | "failed" | "refunded" | "signin";
const POLL_MS = 4000;
const POLL_MAX = 30;

function readCheckout(): { before: number; credits: number } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem("rt_checkout") ?? "null") as { before?: number; credits?: number; at?: number } | null;
    if (!v || typeof v.before !== "number" || Date.now() - (v.at ?? 0) > 6 * 3_600_000) return null;
    return { before: v.before, credits: v.credits ?? 1 };
  } catch { return null; }
}

/**
 * Back from checkout. The server verifies the payment with the provider (Stripe session, or the
 * Mercado Pago payment_id in the return URL) and settles it if the webhook has not yet; "paid"
 * shows only once the balance is above what it was before checkout. Pix/boleto keep polling.
 */
function SuccessInner() {
  const params = useSearchParams();
  const { x, l } = useI18n();
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [lastGen] = useState<string | null>(() => { try { return localStorage.getItem("rt_last_gen"); } catch { return null; } });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let polls = 0;
    const provider = params.get("provider") === "stripe" ? "stripe" : "mp";
    const body = provider === "stripe"
      ? { provider, sessionId: params.get("session_id") ?? undefined }
      : { provider, paymentId: params.get("payment_id") ?? params.get("collection_id") ?? undefined };
    const done = (s: Status) => { if (!cancelled) setStatus(s); };
    const run = async () => {
      const r = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
      if (cancelled) return;
      if (r?.status === 401) return done("signin");
      const j = (await r?.json().catch(() => null)) as { status?: string; credits?: number } | null;
      await refresh();
      const saved = readCheckout();
      const grew = saved ? (j?.credits ?? 0) >= saved.before + saved.credits : false;
      if (j?.status === "refunded") return done("refunded");
      if (j?.status === "failed") return done("failed");
      // Paid only when the provider says so AND the credits are on the account (or, with no
      // payment id to check, when the balance itself grew because the webhook landed).
      if ((j?.status === "paid" && (grew || !saved)) || grew) {
        try { sessionStorage.removeItem("rt_checkout"); } catch {}
        return done("paid");
      }
      done("pending");
      if (!cancelled && polls++ < POLL_MAX) timer = window.setTimeout(() => void run(), POLL_MS);
    };
    timer = window.setTimeout(() => void run(), 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [params, refresh, attempt]);

  const again = () => { setStatus("checking"); setAttempt((n) => n + 1); };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container width="prose" className="py-[var(--s-12)]">
        <div className="card p-8" data-testid="success" data-status={status} aria-live="polite">
          {status === "checking" && <p className="text-ink-2">{x.success.checking}</p>}
          {status === "paid" && <><p className="text-4xl" aria-hidden>✓</p><p className="font-display mt-3 text-3xl text-ink">{x.success.paid}</p>{user && <p className="mt-2 text-ink-2" data-testid="success-credits">{x.success.credits(user.credits)}</p>}</>}
          {status === "pending" && <><p className="text-4xl" aria-hidden>⏳</p><p className="mt-3 text-ink-2">{l.success.pendingLong}</p><button onClick={again} className="btn btn-ghost mt-4">{l.success.checkAgain}</button></>}
          {status === "failed" && <><p className="text-4xl" aria-hidden>✕</p><p className="mt-3 text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]">{x.success.failed}</p><Link href="/pricing" className="btn btn-primary mt-4">{x.credits.buy}</Link></>}
          {status === "refunded" && <p className="text-ink-2">{l.success.refunded}</p>}
          {status === "signin" && <p className="text-ink-2">{l.apiErrors.sign_in_required}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {status === "paid" && lastGen && <Link href={`/start?gen=${lastGen}`} className="btn btn-primary">{x.credits.unlockWith}</Link>}
            <Link href="/library" className="btn btn-ghost">{x.success.toLibrary}</Link>
            <Link href="/contact?topic=payment" className="btn btn-ghost">{l.footer.contact}</Link>
          </div>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}

export default function SuccessPage() { return <Suspense fallback={null}><SuccessInner /></Suspense>; }
