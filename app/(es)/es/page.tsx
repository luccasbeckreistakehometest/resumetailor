import type { Metadata } from "next";
import { HomeView } from "@/app/(site)/HomeView";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("home", "es", seoCopy.es.home);

export default function Home() {
  return <HomeView />;
}
