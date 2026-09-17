import type { Metadata } from "next";
import { ATS_COPY } from "@/app/(site)/ats-check/copy";
import { AtsPage } from "@/app/(site)/ats-check/AtsPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("ats", "es", ATS_COPY.es);

/** The free ATS check, server-rendered in this market's own copy (its URL predates /es). */
export default function LocalisedAtsCheckPage() {
  return <AtsPage lang="es" forced />;
}
