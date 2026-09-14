import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "./i18n/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SupportChat } from "@/components/SupportChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumeTailor — Tailor your resume to any job in 30 seconds",
  description:
    "Paste a job posting and your resume. Get an AI-rewritten resume tailored to that exact role, plus a matching cover letter. No signup. $9.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <AuthProvider>
            {children}
            <SupportChat />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
