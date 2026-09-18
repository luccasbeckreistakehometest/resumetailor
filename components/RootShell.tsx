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
 * `data-theme="light"` is deliberate. The "Desk lamp" dark theme exists in the tokens
 * (docs/DESIGN.md §6.2) but the product screens have not been rebuilt or looked at in it yet, so
 * the attribute pins every route to Paper and stops `prefers-color-scheme` flipping ~40 untested
 * routes. /design removes it to preview the dark ramp. Drop it when surfaces 4–18 are done.
 */
export function RootShell({ lang, children }: { lang: RouteLang; children: React.ReactNode }) {
  return (
    <html lang={htmlLang(lang)} data-scroll-behavior="smooth" data-theme="light"
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
