import type { Metadata } from "next";
import { ATS_COPY } from "./copy";
import { AtsPage } from "./AtsPage";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("ats", "en", ATS_COPY.en);

export default function AtsCheckPage() {
  return <AtsPage lang="en" forced={false} />;
}
