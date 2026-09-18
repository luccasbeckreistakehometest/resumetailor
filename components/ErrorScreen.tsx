"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";

/** The branded 404 / error body: what happened, a way back, and the contact form. */
export function ErrorScreen({ kind, onRetry, digest }: { kind: "notFound" | "error"; onRetry?: () => void; digest?: string }) {
  const { l } = useI18n();
  const E = l.errorPages;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="max-w-xl py-20 text-center">
        <p className="font-mono text-[length:var(--mn-40)] font-medium tabular-nums text-[color:var(--ink-40)]" aria-hidden>{kind === "notFound" ? "404" : "!"}</p>
        <h1 className="font-display mt-4 text-3xl text-ink" data-testid={kind === "notFound" ? "not-found" : "error-page"}>{kind === "notFound" ? E.notFoundTitle : E.errorTitle}</h1>
        <p className="mt-3 text-ink-2">{kind === "notFound" ? E.notFoundText : E.errorText}</p>
        {digest && <p className="mt-2 text-xs text-muted">ref: {digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRetry && <button onClick={onRetry} className="btn btn-primary">{E.retry}</button>}
          <Link href="/" className={onRetry ? "btn btn-ghost" : "btn btn-primary"}>{E.home}</Link>
          <Link href="/contact" className="btn btn-ghost">{E.contact}</Link>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}
