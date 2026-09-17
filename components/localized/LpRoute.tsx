import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seoCopy } from "@/app/i18n/r3/seo";
import { LpView } from "@/app/(site)/lp/[slug]/LpView";
import { pageMetadata } from "@/lib/i18n/metadata";
import { angleFromSlug, angleSlugs, type RouteLang } from "@/lib/i18n/routes";

type Props = { params: Promise<{ slug: string }> };

/** The ad-landing route for one language: static params, metadata with hreflang, 404 for unknown slugs. */
export function lpRoute(lang: RouteLang) {
  return {
    generateStaticParams: () => angleSlugs(lang).map((slug) => ({ slug })),
    generateMetadata: async ({ params }: Props): Promise<Metadata> => {
      const angle = angleFromSlug(lang, (await params).slug);
      const meta = angle ? seoCopy[lang].lp[angle] : undefined;
      return angle && meta ? pageMetadata(`lp:${angle}`, lang, meta) : {};
    },
    Page: async ({ params }: Props) => {
      const angle = angleFromSlug(lang, (await params).slug);
      if (!angle) notFound();
      return <LpView angle={angle} />;
    },
  };
}
