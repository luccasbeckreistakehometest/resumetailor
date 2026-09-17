import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "./i18n/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SupportChat } from "@/components/SupportChat";
import { Tour } from "@/components/Tour";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

const SITE = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TITLE = "ResumeTailor — Your résumé, tailored to the job in 30 seconds";
const DESCRIPTION =
  "Paste a job posting and your résumé, or just talk. Get a résumé rewritten for that exact role, a cover letter, a LinkedIn About and interview prep — with a match score that proves it.";

export const metadata: Metadata = {
  // Absolute URLs for Open Graph images and canonicals (shared /cv links used to point at localhost).
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s | ResumeTailor" },
  description: DESCRIPTION,
  applicationName: "ResumeTailor",
  openGraph: { type: "website", siteName: "ResumeTailor", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper">
        <I18nProvider>
          <AuthProvider>
            {children}
            <Tour />
            <SupportChat />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
