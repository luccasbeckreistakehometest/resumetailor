import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ErrorScreen";

export const metadata: Metadata = { title: "404", robots: { index: false, follow: false } };

export default function NotFound() {
  return <ErrorScreen kind="notFound" />;
}
