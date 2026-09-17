import type { Metadata } from "next";
import { ATS_COPY } from "./copy";
import { AtsPage } from "./AtsPage";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: ATS_COPY.en.title,
  description: ATS_COPY.en.description,
  alternates: { canonical: `${BASE}/ats-check`, languages: { en: `${BASE}/ats-check`, "pt-BR": `${BASE}/ats-check/pt`, es: `${BASE}/ats-check/es` } },
  openGraph: { title: ATS_COPY.en.title, description: ATS_COPY.en.description, url: `${BASE}/ats-check`, type: "website" },
};

export default function AtsCheckPage() {
  return <AtsPage lang="en" forced={false} />;
}
