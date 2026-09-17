import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactView } from "./ContactView";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about a payment, your account or your data? Send the ResumeTailor team a message.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <Suspense fallback={null}><ContactView /></Suspense>;
}
