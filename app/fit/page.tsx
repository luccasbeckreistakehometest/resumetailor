import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { FitChecker } from "./FitChecker";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Am I a fit for this job? Free pre-check — the posting's must-haves vs your résumé | ResumeTailor",
  description: "Paste a job posting and your résumé: every must-have marked found, partial or missing with the line that proves it, a fit score, and the three gaps that matter most. Free, no credit.",
  alternates: { canonical: `${BASE}/fit` },
  openGraph: { title: "Am I a fit for this job? Free pre-check", description: "The posting's must-haves vs your résumé, with evidence, a score and the gaps that matter.", url: `${BASE}/fit`, type: "website" },
};

/** /fit — the free "am I a fit?" pre-check. AI-lite: one cheap call per new pair of texts, cached for everyone after that. */
export default function FitPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-4xl py-12">
        <FitChecker />
      </Container>
      <SiteFooter />
    </div>
  );
}
