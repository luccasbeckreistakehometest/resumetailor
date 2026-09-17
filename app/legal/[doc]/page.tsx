import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, isLegalDoc } from "../docs";
import { LegalView } from "../LegalView";
import { legalIdentity, supportContacts } from "@/lib/server/env";

type Props = { params: Promise<{ doc: string }>; searchParams: Promise<{ lang?: string }> };

// The seller's identity comes from the server's env at request time (never from the build).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDoc(doc)) return {};
  const d = LEGAL_DOCS[doc].en;
  return { title: d.title, description: d.summary, alternates: { canonical: `/legal/${doc}` } };
}

/** /legal/privacy · /legal/terms · /legal/refunds · /legal/cookies — in the visitor's language (?lang=pt|es|en forces one). */
export default async function LegalPage({ params, searchParams }: Props) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  const { lang } = await searchParams;
  const forced = lang === "pt" || lang === "es" || lang === "en" ? lang : null;
  const identity = legalIdentity();
  const support = supportContacts();
  return <LegalView doc={doc} forced={forced} identity={{ ...identity, email: identity.email ?? support.email }} />;
}
