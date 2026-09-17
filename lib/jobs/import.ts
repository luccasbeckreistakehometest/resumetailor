/**
 * "Paste a link": only the three applicant-tracking systems with documented, public, no-login job
 * APIs are read (Greenhouse, Lever, Ashby). Exact host match, https only, no credentials or ports,
 * no redirects, 5 s timeout, 300 KB cap. Everything else — LinkedIn, Indeed, Gupy… — is refused and
 * the person pastes the text instead (LinkedIn forbids scraping).
 */
export type JobProvider = "greenhouse" | "lever" | "ashby";
export interface ParsedJobUrl { provider: JobProvider; apiUrl: string; jobId: string; board: string; canonical: string }
export interface ImportedJob { provider: JobProvider; company: string; title: string; location: string; text: string; salary: string; postedAt: string | null; url: string }

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseJobUrl(raw: string): ParsedJobUrl | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    const [board, jobs, id] = seg;
    if (!board || jobs !== "jobs" || !id || !/^\d{3,20}$/.test(id) || !SLUG.test(board)) return null;
    return { provider: "greenhouse", board, jobId: id, apiUrl: `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`, canonical: `https://${host}/${board}/jobs/${id}` };
  }
  if (host === "jobs.lever.co") {
    const [site, id] = seg;
    if (!site || !id || !UUID.test(id) || !SLUG.test(site)) return null;
    return { provider: "lever", board: site, jobId: id, apiUrl: `https://api.lever.co/v0/postings/${site}/${id}`, canonical: `https://jobs.lever.co/${site}/${id}` };
  }
  if (host === "jobs.ashbyhq.com") {
    const [org, id] = seg;
    if (!org || !id || !UUID.test(id) || !SLUG.test(org)) return null;
    return { provider: "ashby", board: org, jobId: id, apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${org}?includeCompensation=true`, canonical: `https://jobs.ashbyhq.com/${org}/${id}` };
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function htmlToText(html: string): string {
  const decoded = html.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
  return decoded
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\s*(br|\/p|\/div|\/h\d|\/ul|\/ol)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Turns a provider's JSON into one posting. Pure (unit-tested with fixtures). */
export function normaliseJob(p: ParsedJobUrl, data: unknown): ImportedJob | null {
  const d = (data ?? {}) as Json;
  if (p.provider === "greenhouse") {
    const text = htmlToText(str(d.content));
    if (!text) return null;
    const loc = (d.location as Json | undefined)?.name;
    return { provider: p.provider, company: str(d.company_name) || p.board, title: str(d.title), location: str(loc), text, salary: "", postedAt: str(d.updated_at) || str(d.first_published) || null, url: p.canonical };
  }
  if (p.provider === "lever") {
    const lists = Array.isArray(d.lists) ? (d.lists as Json[]).map((l) => `${str(l.text)}\n${htmlToText(str(l.content))}`).join("\n\n") : "";
    const text = [str(d.descriptionPlain), lists, str(d.additionalPlain)].filter(Boolean).join("\n\n").trim();
    if (!text) return null;
    const cats = (d.categories ?? {}) as Json;
    const range = d.salaryRange as Json | undefined;
    const salary = range && range.min ? `${range.currency ?? ""} ${range.min}–${range.max ?? ""} ${range.interval ?? ""}`.trim() : "";
    return { provider: p.provider, company: p.board, title: str(d.text), location: str(cats.location), text, salary, postedAt: typeof d.createdAt === "number" ? new Date(d.createdAt).toISOString() : null, url: p.canonical };
  }
  const jobs = Array.isArray(d.jobs) ? (d.jobs as Json[]) : [];
  const job = jobs.find((j) => str(j.id) === p.jobId);
  if (!job) return null;
  const text = str(job.descriptionPlain) || htmlToText(str(job.descriptionHtml));
  if (!text) return null;
  const comp = job.compensation as Json | undefined;
  return { provider: p.provider, company: p.board, title: str(job.title), location: str(job.location), text, salary: str(comp?.compensationTierSummary) || str(comp?.scrapeableCompensationSalarySummary), postedAt: str(job.publishedAt) || null, url: p.canonical };
}

export const MAX_BYTES = 300_000;

/** Fetches and normalises one posting. `fixture` replaces the network in tests (JOB_IMPORT_MOCK). */
export async function fetchJob(p: ParsedJobUrl, fixture?: (p: ParsedJobUrl) => unknown): Promise<ImportedJob | null> {
  if (fixture) return normaliseJob(p, fixture(p));
  const res = await fetch(p.apiUrl, { redirect: "error", signal: AbortSignal.timeout(5000), headers: { Accept: "application/json", "User-Agent": "ResumeTailor job import (+https://resumetailor.marqa.online)" } });
  if (!res.ok) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
  const body = await res.text();
  if (body.length > MAX_BYTES) return null;
  return normaliseJob(p, JSON.parse(body));
}
