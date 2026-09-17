import type { Metadata } from "next";
import { CompareView } from "@/components/CompareView";
import { seoCopy } from "@/app/i18n/r3/seo";
import { pageMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = pageMetadata("compare", "en", seoCopy.en.compare);

/** The job comparator (free; each posting uses the cached, capped fit check). */
export default function Page() {
  return <CompareView />;
}
