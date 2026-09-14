/**
 * Industry proof statistics for the landing page.
 *
 * IMPORTANT: These are INDUSTRY statistics from named third-party sources
 * (with publication year + URL) — they are NOT measurements of this product's
 * own results. Do not relabel them as "our results" or imply we produced these
 * numbers. Always show the `source` attribution next to the stat in the UI.
 *
 * Each entry below traces to a real, citable source. Full sourcing,
 * reliability notes, recency flags, and the stats we deliberately REJECTED (e.g.
 * the debunked "75% of resumes rejected by ATS" myth) live in
 * docs/marketing/market-data-2026.md (supersedes proof-data.md for recency).
 * Verified 2026-06. Two figures are 2025; the rest are real 2018–2020 field/eye
 * studies. We deliberately did NOT invent a "2026 study."
 */
export const PROOF_STATS: { value: string; label: string; source: string; url: string }[] = [
  {
    value: "98%",
    label: "of Fortune 500 companies screen applications with an ATS",
    source: "Jobscan, 2025",
    url: "https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/",
  },
  {
    value: "62%",
    label: "of hiring managers say a generic, un-customized AI resume is more likely to be rejected",
    source: "Resume Now survey of 925 HR pros, 2025",
    url: "https://www.resume-now.com/job-resources/careers/ai-applicant-report",
  },
  {
    value: "53%",
    label: "higher callback rate for a cover letter tailored to the job (16.4% vs 10.7%)",
    source: "ResumeGo field study (7,287 applications), 2020",
    url: "https://www.resumego.net/research/cover-letters/",
  },
  {
    value: "71%",
    label: "more interview callbacks for a comprehensive, effort-filled application",
    source: "ResumeGo field study (24,570 resumes), 2019",
    url: "https://www.resumego.net/research/linkedin-interview-chances/",
  },
  {
    value: "~7 sec",
    label: "average time recruiters spend on an initial resume scan",
    source: "Ladders eye-tracking study, 2018",
    url: "https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/",
  },
];
