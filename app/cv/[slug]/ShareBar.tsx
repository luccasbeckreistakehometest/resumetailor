"use client";

import { useState } from "react";

/** WhatsApp, LinkedIn and copy — the three ways a résumé link actually travels. */
export function ShareBar({ url, text, labels, testId = "cv" }: { url: string; text: string; labels: { share: string; copy: string; copied: string; whatsapp: string; linkedin: string }; testId?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 text-muted">{labels.share}:</span>
      <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink ring-1 ring-edge hover:ring-ink" data-testid={`${testId}-whatsapp`}>{labels.whatsapp}</a>
      <a href={li} target="_blank" rel="noopener noreferrer" className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink ring-1 ring-edge hover:ring-ink" data-testid={`${testId}-linkedin`}>{labels.linkedin}</a>
      <button onClick={copy} className="rounded-full bg-surface px-2.5 py-1 font-medium text-ink ring-1 ring-edge hover:ring-ink" data-testid={`${testId}-copy`}>{copied ? labels.copied : labels.copy}</button>
    </div>
  );
}
