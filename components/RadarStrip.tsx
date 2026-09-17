"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { ApplicationView } from "@/lib/server/applications";
import type { RadarAlert } from "@/lib/applications/radar";

export type RadarItem = RadarAlert & { message: { subject: string; body: string } | null };

/**
 * The follow-up radar on top of the tracker. Each alert brings the message (the kit's own e-mail
 * when it exists, a template otherwise) with copy / e-mail / WhatsApp buttons and "I sent it".
 * Nothing is sent by us.
 */
export function RadarStrip({ alerts, items, onSent }: { alerts: RadarItem[]; items: ApplicationView[]; onSent: () => void }) {
  const { r, lang, to } = useI18n();
  const R = r.tracker;
  const [copied, setCopied] = useState<string | null>(null);
  const fmt = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang, { day: "numeric", month: "short" }) : "");

  async function sent(appId: string, kind: string) {
    await fetch(`/api/applications/${appId}/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
    onSent();
  }

  return (
    <section className="mt-8 rounded-2xl border border-edge bg-surface p-4" data-testid="radar">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl text-ink">📡 {R.radarTitle}</p>
        <p className="text-xs text-muted">{R.radarStat} — <a href="https://www.greenhouse.com/blog/2024-greenhouse-candidate-experience-report" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{R.radarStatSource}</a></p>
      </div>
      {alerts.length === 0 ? <p className="mt-2 text-sm text-muted" data-testid="radar-empty">{R.radarEmpty}</p> : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {alerts.map((al) => {
            const app = items.find((i) => i.id === al.appId);
            if (!app) return null;
            const k = R.kinds[al.kind];
            const tpl = al.kind === "followup" || al.kind === "thanks" || al.kind === "feedback"
              ? al.message ?? R.templates[al.kind]({ company: app.company, role: app.role || app.company, contact: app.contactName, date: fmt(app.appliedAt) })
              : null;
            const text = tpl ? `${tpl.subject}\n\n${tpl.body}` : "";
            const mail = tpl ? `mailto:${app.contactChannel === "email" ? encodeURIComponent(app.contactValue) : ""}?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body)}` : "";
            const phone = app.contactChannel === "whatsapp" ? app.contactValue.replace(/\D/g, "") : "";
            const wa = tpl ? `https://wa.me/${phone}?text=${encodeURIComponent(tpl.body)}` : "";
            return (
              <li key={`${al.appId}-${al.kind}`} className={"rounded-xl border p-3 " + (al.kind === "moveon" ? "border-edge bg-paper" : "border-gold bg-gold-2/40")} data-testid="radar-alert" data-kind={al.kind}>
                <p className="font-semibold text-ink">{k.t} · <span className="font-normal text-ink-2">{app.company || app.role}</span></p>
                <p className="mt-0.5 text-sm text-ink-2">{k.d(al.days)}</p>
                {al.message && <p className="mt-1 text-xs text-moss">✓ {R.fromKit}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold">
                  {tpl && <button type="button" data-testid="radar-copy" className="rounded-full bg-ink px-3 py-1 text-paper" onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(al.appId); window.setTimeout(() => setCopied(null), 1500); }).catch(() => {}); }}>{copied === al.appId ? `✓ ${R.copied}` : R.copy}</button>}
                  {tpl && <a href={mail} className="text-oxblood" data-testid="radar-mail">{R.email}</a>}
                  {tpl && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-oxblood">{R.whatsapp}</a>}
                  {al.kind === "prep" && <Link href={`/brief/${app.id}`} className="text-oxblood" data-testid="radar-brief">{R.brief}</Link>}
                  {al.kind === "prep" && app.interviewAtTime && <a href={`/api/applications/${app.id}/ics?kind=interview&lang=${lang}`} className="text-oxblood">{R.calendar}</a>}
                  {al.kind === "offer" && lang === "pt" && <Link href={`${to("calculator")}?${app.offerType === "pj" ? "pj" : "clt"}=${app.offerAmount ?? ""}`} className="text-oxblood" data-testid="radar-compare">{R.compare}</Link>}
                  {al.kind === "followup" && <a href={`/api/applications/${app.id}/ics?kind=followup&lang=${lang}`} className="text-oxblood">{R.calendar}</a>}
                  {al.kind !== "prep" && al.kind !== "offer" && <button type="button" onClick={() => void sent(app.id, al.kind)} className="ml-auto text-muted hover:text-ink" data-testid="radar-sent">✓ {R.sent}</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
