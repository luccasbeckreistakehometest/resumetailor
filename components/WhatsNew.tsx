"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";

const KEY = "rt_whatsnew_r3";

/** A quiet, dismissible strip with what changed, pointing at the tools hub. Remembered per browser. */
export function WhatsNew() {
  const { r, to } = useI18n();
  const S = r.showcase;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => { let off = false; try { off = localStorage.getItem(KEY) === "1"; } catch {} setShow(!off); });
    return () => cancelAnimationFrame(id);
  }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm" data-testid="whats-new">
      <span className="font-semibold text-oxblood">{S.whatsNew}</span>
      <span className="text-ink-2">{S.whatsNewItems}</span>
      <Link href={to("tools")} className="font-semibold text-ink underline-offset-4 hover:underline">{S.whatsNewCta} →</Link>
      <button type="button" onClick={close} aria-label={S.dismiss} className="ml-auto text-muted hover:text-ink">✕</button>
    </div>
  );
}
