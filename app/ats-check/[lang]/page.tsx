import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ATS_COPY } from "../copy";
import { AtsPage } from "../AtsPage";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const LANGS = ["pt", "es"] as const;
type L = (typeof LANGS)[number];
const OG_LOCALE: Record<L, string> = { pt: "pt_BR", es: "es_ES" };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!(LANGS as readonly string[]).includes(lang)) return {};
  const c = ATS_COPY[lang as L];
  return {
    title: c.title, description: c.description,
    alternates: { canonical: `${BASE}/ats-check/${lang}`, languages: { en: `${BASE}/ats-check`, "pt-BR": `${BASE}/ats-check/pt`, es: `${BASE}/ats-check/es` } },
    openGraph: { title: c.title, description: c.description, url: `${BASE}/ats-check/${lang}`, type: "website", locale: OG_LOCALE[lang as L] },
  };
}

/** /ats-check/pt and /ats-check/es — the same tool, server-rendered in that market's own copy. */
export default async function LocalisedAtsCheckPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!(LANGS as readonly string[]).includes(lang)) notFound();
  return <AtsPage lang={lang as L} forced />;
}
