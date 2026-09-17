import type { Metadata } from "next";

// Private, per-person pages: never indexed.
export const metadata: Metadata = { title: "My kits", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
