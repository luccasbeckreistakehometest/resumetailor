import type { Metadata } from "next";
import { DesignView } from "./DesignView";

/**
 * The system, rendered. Every primitive in every state, at both densities and in both themes —
 * it is how the work is reviewed, and how a defect like a 2.41:1 disabled label or a 1px meter
 * tick that vanishes gets caught before a customer sees it (docs/DESIGN.md §15).
 *
 * Out of the sitemap, noindex, and in robots.txt's disallow list. Not behind the admin login: it
 * holds no data, and a reviewer should be able to open it on a phone without a password.
 */
export const metadata: Metadata = {
  title: "Design system — ResumeTailor",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignView />;
}
