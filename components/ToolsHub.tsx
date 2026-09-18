"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { FeatureShowcase, isFree } from "@/components/FeatureShowcase";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Stamp } from "@/components/ui";
import type { FeatureKey } from "@/app/i18n/r3/showcase";

/**
 * The order tools are shown in. `satisfies` is the point: add a feature to FeatureKey and this
 * stops compiling until it is placed here too, so nothing can ship and be missing from the one
 * page whose headline promises everything.
 */
const ORDER = {
  ats: 1, fit: 2, compare: 3, calculator: 4, voice: 5, tracker: 6, match: 7, meter: 8, codes: 9, truth: 10,
  human: 11, numbers: 12, editor: 13, interview: 14, pitch: 15, letters: 16, linkedin: 17, webcv: 18, intl: 19,
} satisfies Record<FeatureKey, number>;
export const HUB_FEATURES: readonly FeatureKey[] = (Object.keys(ORDER) as FeatureKey[]).sort((a, b) => ORDER[a] - ORDER[b]);

/** /tools · /pt/recursos · /es/recursos — every tool, free ones first, each a link. The tour ends here. */
export function ToolsHub() {
  const { r, to, startHref } = useI18n();
  const S = r.showcase;
  const links: Record<FeatureKey, string> = {
    ats: to("ats"), fit: to("fit"), compare: to("compare"), calculator: to("calculator"), voice: startHref("via=voice"), tracker: "/applications",
    match: startHref(), meter: startHref(), codes: `${to("pricing")}#code`,
    truth: "/library", human: "/library", numbers: "/library", editor: "/library", interview: "/interview", pitch: "/library",
    letters: "/library", linkedin: "/library", webcv: "/library", intl: "/library",
  };
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-10">
        <Stamp>ResumeTailor</Stamp>
        <h1 className="font-display mt-4 text-4xl text-ink sm:text-5xl" data-tour="hub">{S.hubTitle}</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">{S.hubIntro}</p>
        <section className="mt-8" data-tour="free-tools">
          <p className="eyebrow">{S.hubFree}</p>
          <div className="mt-3"><FeatureShowcase keys={HUB_FEATURES.filter(isFree)} links={links} testId="hub-free" /></div>
        </section>
        <section className="mt-10">
          <p className="eyebrow">{S.hubKit}</p>
          <div className="mt-3"><FeatureShowcase keys={HUB_FEATURES.filter((k) => !isFree(k))} links={links} testId="hub-kit" /></div>
        </section>
      </Container>
      <SiteFooter />
    </div>
  );
}
