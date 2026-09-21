import "@/app/globals.css";
import { fontVariables } from "@/components/fonts";
import { I18nProvider } from "@/app/i18n/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SupportChat } from "@/components/SupportChat";
import { Tour } from "@/components/Tour";
import { LangPill } from "@/components/LangPill";
import { Analytics } from "@/components/Analytics";
import { htmlLang, type RouteLang } from "@/lib/i18n/routes";


/**
 * The document shell shared by the three root layouts: English (every app page), and the
 * Portuguese and Spanish public pages, whose HTML is rendered in that language from the start.
 *
 * The theme follows the reader's own setting. "Desk lamp" (docs/DESIGN.md §6.2) was pinned off
 * while the product screens were still the old ones; the surfaces have been rebuilt on the tokens
 * and looked at in both, so the pin is gone and `prefers-color-scheme` decides. The sheet never
 * inverts in either theme — a résumé is a printed artefact — and @media print restores pure white.
 */
export function RootShell({ lang, children }: { lang: RouteLang; children: React.ReactNode }) {
  return (
    <html lang={htmlLang(lang)} data-scroll-behavior="smooth"
      className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper">
        <I18nProvider initialLang={lang} locked={lang !== "en"}>
          <AuthProvider>
            {children}
            <LangPill />
            <Analytics />
            <Tour />
            <SupportChat />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
