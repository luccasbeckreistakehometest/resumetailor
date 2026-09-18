"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Button } from "@/components/ui";

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
    <section className="mt-[var(--s-9)] border-t border-[var(--rule)] pt-[var(--s-5)]" data-testid="referral">
      <p className="eyebrow">{C.referTitle}</p>
      <p className="mt-[var(--s-3)] max-w-[var(--measure)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{C.referIntro(data.credits)}</p>
      <div className="mt-[var(--s-4)] flex flex-wrap items-center gap-[var(--s-3)]">
        <code className="rounded-[var(--r-1)] bg-[var(--sunken)] px-[var(--s-3)] py-[var(--s-2)] font-mono text-[length:var(--mn-13)] text-[color:var(--ink-2)]" data-testid="referral-link">{data.link}</code>
        <Button size="sm" icon="copy" onClick={() => { void navigator.clipboard.writeText(data.link).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? C.copied : C.copyLink}</Button>
        <Button size="sm" variant="outline" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>{C.shareWa}</Button>
        <Button size="sm" variant="outline" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.link)}`}>{C.shareLi}</Button>
      </div>
      <p className="mt-[var(--s-3)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]" data-testid="referral-stats">{C.stats(data.pending, data.rewarded)}</p>
    </section>
  );
}
