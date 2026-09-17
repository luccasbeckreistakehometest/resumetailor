import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingView } from "./PricingView";

export const metadata: Metadata = {
  title: "Pricing — prepaid credits, no subscription",
  description: "Previews are free and your first full kit is free with an account. Then prepaid credit packs: one credit unlocks one full kit. No subscription, no automatic renewal, credits never expire.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "ResumeTailor pricing — prepaid credits, no subscription", url: "/pricing" },
};

export default function PricingPage() {
  return <Suspense fallback={null}><PricingView /></Suspense>;
}
