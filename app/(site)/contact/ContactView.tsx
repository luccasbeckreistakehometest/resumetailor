"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { apiErrorText } from "@/app/i18n/launch";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";

const TOPICS = ["account", "payment", "password", "privacy", "bug", "other"] as const;
type Topic = (typeof TOPICS)[number];

/** The in-app contact form (always available); email and WhatsApp appear only when configured. */
export function ContactView() {
  const { l, x, lang } = useI18n();
  const C = l.contact;
  const { user, support } = useAuth();
  const params = useSearchParams();
  const initialTopic = TOPICS.includes(params.get("topic") as Topic) ? (params.get("topic") as Topic) : "other";
  const [form, setForm] = useState({ name: "", email: "", topic: initialTopic as Topic, message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const email = form.email || user?.email || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email, lang }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(apiErrorText(j, l, x.errors.generic)); return; }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container width="prose" className="py-[var(--s-10)]">
        <Eyebrow>{C.eyebrow}</Eyebrow>
        <h1 className="font-display mt-2 text-4xl text-ink">{C.title}</h1>
        <p className="mt-3 text-ink-2">{C.intro}</p>
        {sent ? (
          <p className="card mt-8 p-6 text-ink" role="status" data-testid="contact-sent">✓ {C.sent}</p>
        ) : (
          <form onSubmit={submit} className="card mt-8 grid gap-4 p-6" data-testid="contact-form">
            <div>
              <label htmlFor="c-name" className="mb-1 block text-sm font-medium text-ink-2">{C.name}</label>
              <input id="c-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" maxLength={80} />
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1 block text-sm font-medium text-ink-2">{C.email}</label>
              <input id="c-email" className="field" type="email" required value={email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" data-testid="contact-email" />
            </div>
            <div>
              <label htmlFor="c-topic" className="mb-1 block text-sm font-medium text-ink-2">{C.topic}</label>
              <select id="c-topic" className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as Topic })} data-testid="contact-topic">
                {TOPICS.map((t) => <option key={t} value={t}>{C.topics[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-message" className="mb-1 block text-sm font-medium text-ink-2">{C.message}</label>
              <textarea id="c-message" className="field" rows={6} required minLength={10} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="contact-message" />
            </div>
            {/* Honeypot: hidden from people and from assistive tech; bots fill it in. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="c-website">Website</label>
              <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} data-testid="contact-website" />
            </div>
            {error && <p className="text-sm text-oxblood" role="alert" data-testid="contact-error">{error}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <button className="btn btn-primary" disabled={busy} data-testid="contact-send">{busy ? C.sending : C.send}</button>
              <p className="text-xs text-muted">{C.privacyNote.split(".")[0]}. <Link href="/legal/privacy" className="underline">{l.footer.privacy}</Link></p>
            </div>
          </form>
        )}
        {(support.email || support.whatsapp) && (
          <div className="mt-8" data-testid="contact-channels">
            <p className="eyebrow">{C.other}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {support.email && <a className="btn btn-ghost" href={`mailto:${support.email}`}>{C.emailUs}: {support.email}</a>}
              {support.whatsapp && <a className="btn btn-ghost" href={`https://wa.me/${support.whatsapp}`} target="_blank" rel="noopener noreferrer">{C.whatsapp}</a>}
            </div>
          </div>
        )}
      </Container>
      <SiteFooter />
    </div>
  );
}
