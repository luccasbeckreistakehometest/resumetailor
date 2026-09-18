"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Icon } from "@/components/ui";

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
    <div className="mb-[var(--s-8)] flex flex-wrap items-baseline gap-x-[var(--s-4)] gap-y-[var(--s-2)] border-y border-[var(--rule-hairline)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)]" data-testid="whats-new">
      <span className="eyebrow">{S.whatsNew.replace(":", "")}</span>
      <span className="text-[color:var(--ink-2)]">{S.whatsNewItems}</span>
      <Link href={to("tools")} className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px] hover:decoration-[var(--ink)]">{S.whatsNewCta} →</Link>
      <button type="button" onClick={close} aria-label={S.dismiss} className="ml-auto self-center text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"><Icon name="close" size={16} /></button>
    </div>
  );
}
