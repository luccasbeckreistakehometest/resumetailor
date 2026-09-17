import type { Metadata } from "next";
import { RootShell } from "@/components/RootShell";
import { siteMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = siteMetadata("es");

/** Root layout of the public pages whose URL is in this language: the HTML is rendered in it. */
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell lang="es">{children}</RootShell>;
}
