"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button, Container } from "@/components/ui";

/** The branded 404 / error body: what happened, a way back, and the contact form. */
export function ErrorScreen({ kind, onRetry, digest }: { kind: "notFound" | "error"; onRetry?: () => void; digest?: string }) {
  const { l } = useI18n();
  const E = l.errorPages;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="py-[var(--s-12)]">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)]">
          <div className="col-span-12 max-w-[var(--measure)] md:col-span-8 md:col-start-2">
            <p className="font-mono text-[length:var(--mn-40)] font-medium tabular-nums text-[color:var(--ink-40)]" aria-hidden>{kind === "notFound" ? "404" : "!"}</p>
            <h1 className="doc-31 mt-[var(--s-5)] text-[color:var(--ink)]" data-testid={kind === "notFound" ? "not-found" : "error-page"}>{kind === "notFound" ? E.notFoundTitle : E.errorTitle}</h1>
            <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{kind === "notFound" ? E.notFoundText : E.errorText}</p>
            {digest && <p className="mt-[var(--s-3)] font-mono text-[length:var(--mn-13)] text-[color:var(--ink-muted)]">ref: {digest}</p>}
            <div className="mt-[var(--s-8)] flex flex-wrap gap-[var(--s-3)]">
              {onRetry && <Button onClick={onRetry}>{E.retry}</Button>}
              <Button href="/" variant={onRetry ? "outline" : "primary"}>{E.home}</Button>
              <Button href="/contact" variant="quiet">{E.contact}</Button>
            </div>
          </div>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}
