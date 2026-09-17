import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import { ErrorScreen } from "@/components/ErrorScreen";
import { SITE } from "@/lib/i18n/metadata";

export const metadata: Metadata = { metadataBase: new URL(SITE), title: "Page not found | ResumeTailor", robots: { index: false, follow: false } };

/**
 * A URL that matches no route at all. The app has three root layouts (English, /pt, /es), so the
 * branded 404 brings its own shell; the copy then follows the visitor's language.
 */
export default function GlobalNotFound() {
  return <RootShell lang="en"><ErrorScreen kind="notFound" /></RootShell>;
}
