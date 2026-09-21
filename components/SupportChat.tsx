"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { Button, Icon } from "@/components/ui";

/**
 * Support (surface 17): quick answers, the in-app contact form (always), and email / WhatsApp only
 * when the server has them configured (SUPPORT_EMAIL / SUPPORT_WHATSAPP).
 *
 * It used to be a 56px oxblood circle with a speech bubble in it, floating over every page — the
 * single most template-looking object in the product, and red, which this system reserves for a
 * correction. The entry point is now a quiet ruled tab that says what it is in words. The panel
 * keeps every channel it had.
 */
export function SupportChat() {
  const { d, l } = useI18n();
  const { support } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // A published résumé is someone's page, not ours: no support tab on it (nor on the print view).
  if (pathname.startsWith("/cv/") || pathname.startsWith("/print")) return null;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-[68px] right-[var(--s-5)] z-50 flex w-[calc(100vw-2rem)] max-w-[360px] flex-col overflow-hidden rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] sm:right-[var(--s-7)]"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="flex items-center justify-between gap-[var(--s-4)] border-b border-[var(--rule-hairline)] px-[var(--s-5)] py-[var(--s-4)]" role="heading" aria-level={2}>
            <span className="font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{d.chat.title}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={d.chat.close}
              type="button"
              className="-mr-[var(--s-2)] grid h-8 w-8 place-items-center rounded-[var(--r-1)] text-[color:var(--ink-muted)] hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-[var(--s-5)] py-[var(--s-5)]">
            <p className="font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{d.chat.greeting}</p>

            <h4 className="eyebrow mt-[var(--s-6)]">{d.chat.faqTitle}</h4>
            <div className="mt-[var(--s-3)] border-t border-[var(--rule-hairline)]">
              {d.chat.faqs.map((f) => (
                <details key={f.q} className="group border-b border-[var(--rule-hairline)] py-[var(--s-3)]">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-[var(--s-4)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink)]">
                    {f.q}
                    <span className="relative top-[2px] shrink-0 text-[color:var(--ink-muted)] group-open:hidden"><Icon name="plus" size={16} /></span>
                    <span className="relative top-[2px] hidden shrink-0 text-[color:var(--ink-muted)] group-open:block"><Icon name="minus" size={16} /></span>
                  </summary>
                  <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-2)]">{f.a}</p>
                </details>
              ))}
            </div>

            <div className="mt-[var(--s-6)] grid gap-[var(--s-3)]">
              <Button href="/contact" size="sm" className="w-full" onClick={() => setOpen(false)} data-testid="support-contact">{l.contact.send}</Button>
              {support.email && (
                <Button href={`mailto:${support.email}`} variant="outline" size="sm" className="w-full" data-testid="support-email">{d.chat.emailBtn}</Button>
              )}
              {support.whatsapp && (
                <Button href={`https://wa.me/${support.whatsapp}`} variant="outline" size="sm" className="w-full">{d.chat.whatsappBtn}</Button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={d.chat.openAria}
        aria-expanded={open}
        data-testid="support-open"
        type="button"
        className="fixed bottom-[var(--s-5)] right-[var(--s-5)] z-50 inline-flex h-9 items-center gap-[var(--s-2)] rounded-[var(--r-2)] border border-[var(--rule-field)] bg-[var(--raised)] px-[var(--s-4)] font-sans text-[length:var(--ui-13)] font-medium text-[color:var(--ink-2)] transition-colors hover:bg-[var(--sunken)] hover:text-[color:var(--ink)] sm:right-[var(--s-7)]"
      >
        {open && <Icon name="close" size={16} />}
        {d.chat.title}
      </button>
    </>
  );
}
