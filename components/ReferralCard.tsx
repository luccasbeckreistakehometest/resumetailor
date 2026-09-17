"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";

type Ref = { code: string; link: string; credits: number; pending: number; rewarded: number };

/** "Indique e ganhe": the share link, WhatsApp / LinkedIn buttons and the counts. Accounts only. */
export function ReferralCard() {
  const { r } = useI18n();
  const C = r.codes;
  const [data, setData] = useState<Ref | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/referrals", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)).then((j) => { if (alive) setData(j); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!data) return null;
  const text = `${C.shareText} ${data.link}`;
  return (
    <section className="card mt-8 p-5" data-testid="referral">
      <p className="font-display text-2xl text-ink">🤝 {C.referTitle}</p>
      <p className="mt-1 text-sm text-ink-2">{C.referIntro(data.credits)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded bg-paper px-2 py-1 text-sm text-ink" data-testid="referral-link">{data.link}</code>
        <button type="button" className="btn btn-ink !py-1.5 !text-sm" onClick={() => { void navigator.clipboard.writeText(data.link).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? C.copied : C.copyLink}</button>
        <a className="btn btn-ghost !py-1.5 !text-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>{C.shareWa}</a>
        <a className="btn btn-ghost !py-1.5 !text-sm" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.link)}`}>{C.shareLi}</a>
      </div>
      <p className="mt-2 text-xs text-muted" data-testid="referral-stats">{C.stats(data.pending, data.rewarded)}</p>
    </section>
  );
}
