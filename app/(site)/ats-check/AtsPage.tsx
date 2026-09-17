import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { AtsChecker, AtsSeo } from "./AtsChecker";
import type { Lang } from "@/lib/ats/check";

/**
 * The free ATS check page. The search-facing copy is server-rendered in the route's language
 * (en at /ats-check, pt at /ats-check/pt, es at /ats-check/es — each under its own root layout,
 * so the HTML is in that language); on the default route it then follows the visitor's language.
 */
export function AtsPage({ lang, forced }: { lang: Lang; forced: boolean }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="max-w-4xl py-12">
        <AtsSeo lang={lang} forced={forced} part="head" />
        <AtsChecker lang={lang} forced={forced} />
        <AtsSeo lang={lang} forced={forced} part="faq" />
      </Container>
      <SiteFooter />
    </div>
  );
}
