import type { Metadata } from "next";
import { StartView } from "./StartView";

export const metadata: Metadata = {
  title: "Start — talk or type, get your tailored kit",
  description: "Describe yourself out loud or paste your résumé and the job posting. See your match score for free; your first full kit is free with an account.",
  alternates: { canonical: "/start" },
  openGraph: { title: "Start your ResumeTailor kit", url: "/start" },
};

export default function StartPage() {
  return <StartView />;
}
