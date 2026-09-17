import { createHash } from "node:crypto";
import { z } from "zod";
import { withOwner, bad, limited } from "@/lib/server/http";
import { takeAll } from "@/lib/server/ratelimit";
import { getDb, nowIso } from "@/lib/server/db";
import { fetchJob, parseJobUrl, type ImportedJob } from "@/lib/jobs/import";
import { jobFixture } from "@/lib/jobs/fixtures";
import { testFixturesAllowed } from "@/lib/server/env";

export const runtime = "nodejs";
const schema = z.object({ url: z.string().min(8).max(500) });
const TTL_MS = 24 * 3600_000;

type Row = { url: string; host: string; company: string; title: string; location: string; salary: string; text: string; postedAt: string | null; fetchedAt: string };

/**
 * A job link → its text, for Greenhouse, Lever and Ashby only (422 unsupported otherwise). Cached
 * for a day; imports per visitor per day and per IP per hour are capped. No AI.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("check_fields");
    if (owner.isNewAnon) return bad("forbidden", 403);
    const job = parseJobUrl(parsed.data.url);
    if (!job) return { body: { error: "unsupported" }, status: 422 };
    const hash = createHash("sha256").update(job.canonical).digest("hex");
    const db = getDb();
    const cached = db.prepare("SELECT * FROM job_imports WHERE urlHash = ?").get(hash) as Row | undefined;
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < TTL_MS) return { body: { job: { ...cached, provider: job.provider }, cached: true } };
    const over = takeAll([["JOB_IMPORT_OWNER_DAY", owner.key], ["JOB_IMPORT_IP_HOUR", owner.ip]]);
    if (over) return limited(over);
    const mock = process.env.JOB_IMPORT_MOCK === "1" && testFixturesAllowed() ? jobFixture : undefined;
    let result: ImportedJob | null = null;
    try { result = await fetchJob(job, mock); } catch (error) { console.error("[job-import]", job.provider, error instanceof Error ? error.message : error); }
    if (!result) return { body: { error: "import_failed" }, status: 502 };
    db.prepare(`INSERT INTO job_imports (urlHash,url,host,company,title,location,salary,text,postedAt,fetchedAt) VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(urlHash) DO UPDATE SET company=excluded.company, title=excluded.title, location=excluded.location, salary=excluded.salary, text=excluded.text, postedAt=excluded.postedAt, fetchedAt=excluded.fetchedAt`)
      .run(hash, result.url, new URL(result.url).hostname, result.company, result.title, result.location, result.salary, result.text.slice(0, 20000), result.postedAt, nowIso());
    return { body: { job: result, cached: false } };
  });
}
