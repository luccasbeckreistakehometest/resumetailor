import type { Metadata } from "next";
import { PricingView } from "@/app/(site)/pricing/PricingView";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("pricing", "es", seoCopy.es.pricing);

export default function PricingPage() {
  return <PricingView />;
}
