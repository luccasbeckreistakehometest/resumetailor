"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Container } from "@/components/ui";

function SuccessInner() {
  const params = useSearchParams();
  const { x } = useI18n();
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const lastGen = typeof window !== "undefined" ? localStorage.getItem("rt_last_gen") : null;

  useEffect(() => {
    const provider = params.get("provider");
    const sessionId = params.get("session_id");
    (async () => {
      if (provider === "stripe" && sessionId) {
        const r = await fetch(`/api/verify?session_id=${sessionId}`).then((r) => r.json()).catch(() => ({ paid: false }));
        await refresh();
        setStatus(r.paid ? "paid" : "failed");
      } else {
        // Mercado Pago credits arrive through the webhook; poll briefly for the balance to move.
        const before = user?.credits ?? 0;
        for (let i = 0; i < 6; i++) { await refresh(); await new Promise((s) => setTimeout(s, 1500)); }
        const r = await fetch("/api/auth/me").then((r) => r.json());
        setStatus(params.get("pending") || (r.user?.credits ?? 0) <= before ? "pending" : "paid");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-xl py-20 text-center">
        <div className="card p-8" data-testid="success">
          {status === "checking" && <p className="text-ink-2">{x.success.checking}</p>}
          {status === "paid" && <><p className="text-4xl">✓</p><p className="font-display mt-3 text-3xl text-ink">{x.success.paid}</p>{user && <p className="mt-2 text-ink-2">{x.success.credits(user.credits)}</p>}</>}
          {status === "pending" && <><p className="text-4xl">⏳</p><p className="mt-3 text-ink-2">{x.success.pending}</p></>}
          {status === "failed" && <><p className="text-4xl">✕</p><p className="mt-3 text-oxblood">{x.success.failed}</p></>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {lastGen && <Link href={`/start?gen=${lastGen}`} className="btn btn-primary">{x.credits.unlockWith}</Link>}
            <Link href="/library" className="btn btn-ghost">{x.success.toLibrary}</Link>
            <Link href="/start" className="btn btn-ghost">{x.success.again}</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function SuccessPage() { return <Suspense fallback={null}><SuccessInner /></Suspense>; }
