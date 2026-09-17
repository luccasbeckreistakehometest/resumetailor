import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import { secretEnv } from "@/lib/server/env";

/** Company insights exist only with a real search key; the copy that promises them hides too. */
export const insightsEnabled = () => !!secretEnv("TAVILY_API_KEY") || (aiMock() && process.env.AI_MOCK_INSIGHTS === "1");
type Hit = { title: string; url: string; content: string };

async function tavily(query: string): Promise<Hit[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: secretEnv("TAVILY_API_KEY"), query, search_depth: "basic", max_results: 4 }),
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
export async function companyInsights(jobDescription: string): Promise<{ insights: Insights; costUsd: number; model: string }> {
  if (aiMock()) return { insights: { enabled: true, found: true, company: "Acme", about: "Acme builds demo software. [demo]", tech: ["TypeScript"], interview: ["Two rounds, one take-home."], sources: [{ title: "Acme — About", url: "https://example.com" }] }, costUsd: 0, model: "mock" };
  if (!insightsEnabled()) return { insights: { enabled: false, found: false }, costUsd: 0, model: "" };
  const c = getClient();
  const ex = await c.messages.stream({
    model: EXTRACT_MODEL, max_tokens: 200,
    system: 'Extract the hiring company name and the role from this job description. If the company is not stated, company is "".',
    messages: [{ role: "user", content: jobDescription.slice(0, 4000) }],
    output_config: { format: zodOutputFormat(Company) },
  }).finalMessage();
  const company = (ex.parsed_output as z.infer<typeof Company> | null)?.company?.trim() ?? "";
  const role = (ex.parsed_output as z.infer<typeof Company> | null)?.role?.trim() ?? "";
  let costUsd = costOf(ex.usage, EXTRACT_MODEL);
  if (!company) return { insights: { enabled: true, found: false }, costUsd, model: EXTRACT_MODEL };

  const all = (await Promise.all([
    tavily(`${company} company what they do overview`), tavily(`${company} engineering tech stack tools`), tavily(`${company} interview hiring process candidates`),
  ])).flat();
  if (!all.length) return { insights: { enabled: true, found: false, company }, costUsd, model: EXTRACT_MODEL };
  const context = all.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || "").slice(0, 700)}`).join("\n\n");

  const sy = await c.messages.stream({
    model: EXTRACT_MODEL, max_tokens: 900,
    system: `You summarize ONLY from the provided web search results to help a candidate prepare for a role at "${company}"${role ? ` (${role})` : ""}. Use ONLY facts present in the SEARCH RESULTS. Never invent. If a section has no support, return "" or []. about: 2-3 sentences. tech: max 10 concrete tools. interview: concrete steps/notes. sourceIdx: the [n] indices you actually used.`,
    messages: [{ role: "user", content: `SEARCH RESULTS:\n\n${context}` }],
    output_config: { format: zodOutputFormat(Synth) },
  }).finalMessage();
  costUsd += costOf(sy.usage, EXTRACT_MODEL);
  const p = (sy.parsed_output as z.infer<typeof Synth> | null) ?? { about: "", tech: [], interview: [], sourceIdx: [] };
  const used = p.sourceIdx.map((n) => all[n - 1]).filter(Boolean).slice(0, 5).map((r) => ({ title: r.title, url: r.url }));
  const insights: Insights = { enabled: true, found: true, company, about: p.about, tech: p.tech.slice(0, 10), interview: p.interview.slice(0, 8), sources: used.length ? used : all.slice(0, 3).map((r) => ({ title: r.title, url: r.url })) };
  return { insights, costUsd, model: EXTRACT_MODEL };
}
