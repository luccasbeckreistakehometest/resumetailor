import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ANGLES, LP_META, isAngle } from "./angles";
import { LpView } from "./LpView";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return ANGLES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isAngle(slug)) return {};
  const m = LP_META[slug];
  return { title: m.title, description: m.description, alternates: { canonical: `/lp/${slug}` }, openGraph: { title: m.title, description: m.description, url: `/lp/${slug}` } };
}

/** Ad landings: one angle each; an unknown slug is a real 404, not a silent fallback. */
export default async function AdLandingPage({ params }: Props) {
  const { slug } = await params;
  if (!isAngle(slug)) notFound();
  return <LpView angle={slug} />;
}
