"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";

const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@resumetailor.app";
const WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || ""; // digits only, e.g. 5511999999999

export function SupportChat() {
  const { d } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl sm:right-6">
          <div className="flex items-center justify-between bg-oxblood px-4 py-3 text-white">
            <span className="font-semibold">{d.chat.title}</span>
            <button onClick={() => setOpen(false)} aria-label={d.chat.close} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            <p className="text-sm text-ink-2">{d.chat.greeting}</p>

            <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{d.chat.faqTitle}</h4>
            <div className="mt-2 space-y-2">
              {d.chat.faqs.map((f) => (
                <details key={f.q} className="rounded-lg border border-edge bg-paper p-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink">{f.q}</summary>
                  <p className="mt-2 text-sm text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2">
              <a
                href={`mailto:${EMAIL}`}
                className="rounded-lg bg-oxblood px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-oxblood-2"
              >
                {d.chat.emailBtn}
              </a>
              {WHATSAPP && (
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-moss hover:bg-moss-2"
                >
                  {d.chat.whatsappBtn}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={d.chat.openAria}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-oxblood text-white shadow-lg transition hover:bg-oxblood-2 sm:right-6"
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
