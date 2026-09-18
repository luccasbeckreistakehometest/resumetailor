"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LangSync } from "@/components/LangSync";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Eyebrow } from "@/components/ui";
import { LEGAL_DOCS, type LegalDocKey } from "./docs";
import { LEGAL_UPDATED, type Block } from "./content/types";

type Identity = { name: string | null; document: string | null; address: string | null; email: string | null };

const LABELS = {
  en: { updated: "Last updated", who: "Who runs ResumeTailor", name: "Operator", document: "Tax ID (CPF/CNPJ)", address: "Address", email: "E-mail", contact: "Contact form", noIdentity: "The operator's registration details are being added. Until then, questions about this document go through the contact form.", other: "Also see" },
  pt: { updated: "Atualizado em", who: "Quem opera o ResumeTailor", name: "Responsável", document: "CPF/CNPJ", address: "Endereço", email: "E-mail", contact: "Formulário de contato", noIdentity: "Os dados de cadastro do responsável estão sendo incluídos. Enquanto isso, dúvidas sobre este documento vão pelo formulário de contato.", other: "Veja também" },
  es: { updated: "Última actualización", who: "Quién opera ResumeTailor", name: "Responsable", document: "Identificación fiscal (CPF/CNPJ)", address: "Dirección", email: "Correo", contact: "Formulario de contacto", noIdentity: "Los datos de registro del responsable se están agregando. Mientras tanto, las dudas sobre este documento van por el formulario de contacto.", other: "Ver también" },
};

function Blocks({ body }: { body: Block[] }) {
  return (
    <>
      {body.map((b, i) => typeof b === "string"
        ? <p key={i} className="mt-3 leading-relaxed text-ink-2">{b}</p>
        : <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2">{b.list.map((li) => <li key={li}>{li}</li>)}</ul>)}
    </>
  );
}

export function LegalView({ doc, forced, identity }: { doc: LegalDocKey; forced: "en" | "pt" | "es" | null; identity: Identity }) {
  const { lang, l } = useI18n();
  const d = LEGAL_DOCS[doc][lang];
  const L = LABELS[lang];
  const locale = lang === "pt" ? "pt-BR" : lang;
  const updated = new Date(`${LEGAL_UPDATED}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const hasIdentity = identity.name || identity.document || identity.address || identity.email;
  const others = (Object.keys(LEGAL_DOCS) as LegalDocKey[]).filter((k) => k !== doc);
  return (
    <div className="flex min-h-screen flex-col">
      {forced && <LangSync lang={forced} />}
      <SiteHeader />
      <Container width="prose" className="py-[var(--s-10)]">
        <article data-testid="legal-doc" data-doc={doc} lang={lang === "pt" ? "pt-BR" : lang}>
          <Eyebrow>{l.footer.legal}</Eyebrow>
          <h1 className="doc-45 mt-[var(--s-3)] text-[color:var(--ink)]">{d.title}</h1>
          <p className="mt-2 text-sm text-muted">{L.updated}: {updated}</p>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{d.summary}</p>

          <section className="mt-[var(--s-8)] border border-[var(--rule)] p-[var(--s-5)]" data-testid="legal-identity">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{L.who}</h2>
            {hasIdentity ? (
              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
                {identity.name && <><dt className="text-muted">{L.name}</dt><dd className="text-ink">{identity.name}</dd></>}
                {identity.document && <><dt className="text-muted">{L.document}</dt><dd className="text-ink">{identity.document}</dd></>}
                {identity.address && <><dt className="text-muted">{L.address}</dt><dd className="text-ink">{identity.address}</dd></>}
                {identity.email && <><dt className="text-muted">{L.email}</dt><dd className="break-all text-ink"><a className="underline" href={`mailto:${identity.email}`}>{identity.email}</a></dd></>}
                <dt className="text-muted">{L.contact}</dt><dd><Link href="/contact?topic=privacy" className="text-[color:var(--ink)] decoration-[var(--rule-field)] underline">/contact</Link></dd>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-2">{L.noIdentity} <Link href="/contact?topic=privacy" className="font-medium text-[color:var(--ink)] decoration-[var(--rule-field)] underline">{l.footer.contact} →</Link></p>
            )}
          </section>

          {d.sections.map((s) => (
            <section key={s.h} className="mt-8">
              <h2 className="doc-26 text-[color:var(--ink)]">{s.h}</h2>
              <Blocks body={s.body} />
            </section>
          ))}

          <p className="mt-10 text-sm text-muted">
            {L.other}: {others.map((k, i) => <span key={k}>{i > 0 && " · "}<Link href={`/legal/${k}`} className="underline hover:text-ink">{LEGAL_DOCS[k][lang].title}</Link></span>)}
          </p>
        </article>
      </Container>
      <SiteFooter />
    </div>
  );
}
