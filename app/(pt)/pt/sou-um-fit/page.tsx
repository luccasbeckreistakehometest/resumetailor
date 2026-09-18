import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { FitChecker } from "@/app/(site)/fit/FitChecker";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("fit", "pt", seoCopy.pt.fit);

/** /fit — the free "am I a fit?" pre-check. AI-lite: one cheap call per new pair of texts, cached for everyone after that. */
export default function FitPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container width="reading" className="py-[var(--s-11)]">
        <FitChecker />
      </Container>
      <SiteFooter />
    </div>
  );
}
