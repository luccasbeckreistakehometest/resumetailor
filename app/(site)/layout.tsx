import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import { siteMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = siteMetadata("en");

/** Root layout for every English and app page. /pt and /es have their own (see app/(pt), app/(es)). */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="en">{children}</RootShell>;
}
