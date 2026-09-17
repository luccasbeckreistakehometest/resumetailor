import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ats = { en: `${BASE}/ats-check`, "pt-BR": `${BASE}/ats-check/pt`, es: `${BASE}/ats-check/es` };

/** Public, indexable pages only. Everything behind a session or a cookie is left out on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: ats.en, lastModified, changeFrequency: "monthly", priority: 0.9, alternates: { languages: ats } },
    { url: ats["pt-BR"], lastModified, changeFrequency: "monthly", priority: 0.9, alternates: { languages: ats } },
    { url: ats.es, lastModified, changeFrequency: "monthly", priority: 0.9, alternates: { languages: ats } },
    { url: `${BASE}/start`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    ...["jobseeker", "firstjob", "careerchange", "vschatgpt"].map((slug) => ({ url: `${BASE}/lp/${slug}`, lastModified, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
