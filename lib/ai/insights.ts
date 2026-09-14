import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, getClient } from "@/lib/ai/client";

const TAVILY_KEY = process.env.TAVILY_API_KEY;
type Hit = { title: string; url: string; content: string };

async function tavily(query: string): Promise<Hit[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "basic", max_results: 4 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch { return []; }
}

const Company = z.object({ company: z.string(), role: z.string() });
const Synth = z.object({ about: z.string(), tech: z.array(z.string()), interview: z.array(z.string()), sourceIdx: z.array(z.number()) });

export interface Insights {
  enabled: boolean; found: boolean; company?: string; about?: string; tech?: string[]; interview?: string[];
  sources?: { title: string; url: string }[];
}

/** Public company facts for interview prep. Optional: with no search key it reports disabled rather than invent. */
export async function companyInsights(jobDescription: string): Promise<Insights> {
  if (aiMock()) return { enabled: true, found: true, company: "Acme", about: "Acme builds demo software. [demo]", tech: ["TypeScript"], interview: ["Two rounds, one take-home."], sources: [{ title: "Acme — About", url: "https://example.com" }] };
  if (!TAVILY_KEY) return { enabled: false, found: false };
  const c = getClient();
  const ex = await c.messages.stream({
    model: EXTRACT_MODEL, max_tokens: 200,
    system: 'Extract the hiring company name and the role from this job description. If the company is not stated, company is "".',
    messages: [{ role: "user", content: jobDescription.slice(0, 4000) }],
    output_config: { format: zodOutputFormat(Company) },
  }).finalMessage();
  const company = (ex.parsed_output as z.infer<typeof Company> | null)?.company?.trim() ?? "";
  const role = (ex.parsed_output as z.infer<typeof Company> | null)?.role?.trim() ?? "";
  if (!company) return { enabled: true, found: false };

  const all = (await Promise.all([
    tavily(`${company} company what they do overview`), tavily(`${company} engineering tech stack tools`), tavily(`${company} interview hiring process candidates`),
  ])).flat();
  if (!all.length) return { enabled: true, found: false, company };
  const context = all.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || "").slice(0, 700)}`).join("\n\n");

  const sy = await c.messages.stream({
    model: EXTRACT_MODEL, max_tokens: 900,
    system: `You summarize ONLY from the provided web search results to help a candidate prepare for a role at "${company}"${role ? ` (${role})` : ""}. Use ONLY facts present in the SEARCH RESULTS. Never invent. If a section has no support, return "" or []. about: 2-3 sentences. tech: max 10 concrete tools. interview: concrete steps/notes. sourceIdx: the [n] indices you actually used.`,
    messages: [{ role: "user", content: `SEARCH RESULTS:\n\n${context}` }],
    output_config: { format: zodOutputFormat(Synth) },
  }).finalMessage();
  const p = (sy.parsed_output as z.infer<typeof Synth> | null) ?? { about: "", tech: [], interview: [], sourceIdx: [] };
  const used = p.sourceIdx.map((n) => all[n - 1]).filter(Boolean).slice(0, 5).map((r) => ({ title: r.title, url: r.url }));
  return { enabled: true, found: true, company, about: p.about, tech: p.tech.slice(0, 10), interview: p.interview.slice(0, 8), sources: used.length ? used : all.slice(0, 3).map((r) => ({ title: r.title, url: r.url })) };
}
