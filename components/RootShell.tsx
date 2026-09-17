import { Fraunces, Inter } from "next/font/google";
import "@/app/globals.css";
import { I18nProvider } from "@/app/i18n/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SupportChat } from "@/components/SupportChat";
import { Tour } from "@/components/Tour";
import { LangPill } from "@/components/LangPill";
import { htmlLang, type RouteLang } from "@/lib/i18n/routes";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

/**
 * The document shell shared by the three root layouts: English (every app page), and the
 * Portuguese and Spanish public pages, whose HTML is rendered in that language from the start.
 */
export function RootShell({ lang, children }: { lang: RouteLang; children: React.ReactNode }) {
  return (
    <html lang={htmlLang(lang)} data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper">
        <I18nProvider initialLang={lang} locked={lang !== "en"}>
          <AuthProvider>
            {children}
            <LangPill />
            <Tour />
            <SupportChat />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
