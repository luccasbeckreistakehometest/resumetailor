"use client";

import { useState } from "react";

/** WhatsApp, LinkedIn and copy — the three ways a résumé link actually travels. */
export function ShareBar({ url, text, labels, testId = "cv" }: { url: string; text: string; labels: { share: string; copy: string; copied: string; whatsapp: string; linkedin: string }; testId?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const item =
    "inline-flex h-7 items-center gap-[var(--s-2)] rounded-[var(--r-1)] border border-[var(--rule)] px-[var(--s-3)] " +
    "font-sans text-[length:var(--ui-12)] font-medium text-[color:var(--ink-2)] hover:border-[var(--ink-40)] hover:text-[color:var(--ink)]";
  return (
    <div className="flex flex-wrap items-center gap-[var(--s-2)]">
      <span className="mr-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{labels.share}</span>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={item} data-testid={`${testId}-whatsapp`}>{labels.whatsapp}</a>
      <a href={li} target="_blank" rel="noopener noreferrer" className={item} data-testid={`${testId}-linkedin`}>{labels.linkedin}</a>
      <button onClick={copy} className={item} data-testid={`${testId}-copy`}>{copied ? labels.copied : labels.copy}</button>
    </div>
  );
}
