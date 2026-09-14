import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TAVILY_KEY = process.env.TAVILY_API_KEY;

type TavilyResult = { title: string; url: string; content: string };

async function tavily(query: string): Promise<TavilyResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: "basic",
        max_results: 4,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  // Feature is optional: without a search key we return disabled (never fabricate).
  if (!TAVILY_KEY) return NextResponse.json({ enabled: false });

  try {
    const { jobDescription } = await req.json();
    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.length < 30) {
      return NextResponse.json({ enabled: true, found: false });
    }

    // 1) Extract the company name (and role) from the JD.
    const extract = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extract the hiring company name and the role from this job description. Return JSON {"company": string, "role": string}. If the company is not stated, return "" for company.',
        },
        { role: "user", content: jobDescription.slice(0, 4000) },
      ],
    });
    let company = "";
    let role = "";
    try {
      const j = JSON.parse(extract.choices[0]?.message?.content ?? "{}");
      company = (j.company || "").trim();
      role = (j.role || "").trim();
    } catch {}

    if (!company) return NextResponse.json({ enabled: true, found: false });

    // 2) Search the web for real, public info.
    const [about, tech, hiring] = await Promise.all([
      tavily(`${company} company what they do overview`),
      tavily(`${company} engineering tech stack tools`),
      tavily(`${company} interview hiring process candidates`),
    ]);
    const all = [...about, ...tech, ...hiring];
    if (all.length === 0) return NextResponse.json({ enabled: true, found: false, company });

    const context = all
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || "").slice(0, 700)}`)
      .join("\n\n");

    // 3) Synthesize — strictly from the retrieved content, no fabrication.
    const synth = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You summarize ONLY from the provided web search results to help a candidate prepare for a role at "${company}"${role ? ` (${role})` : ""}.
Use ONLY facts present in the SEARCH RESULTS. Never invent. If a section has no support, return an empty string/array for it.
Return JSON: {
  "about": "string — 2-3 sentences on what the company does",
  "tech": ["string"],          // concrete technologies/tools mentioned (max 10); [] if none found
  "interview": ["string"],     // concrete steps/notes about their hiring/interview process; [] if none found
  "sourceIdx": [number]        // the [n] indices you actually used
}`,
        },
        { role: "user", content: `SEARCH RESULTS:\n\n${context}` },
      ],
    });

    let parsed: { about?: string; tech?: string[]; interview?: string[]; sourceIdx?: number[] } = {};
    try {
      parsed = JSON.parse(synth.choices[0]?.message?.content ?? "{}");
    } catch {}

    const usedIdx = Array.isArray(parsed.sourceIdx) ? parsed.sourceIdx : [];
    const sources = usedIdx
      .map((n) => all[n - 1])
      .filter(Boolean)
      .slice(0, 5)
      .map((r) => ({ title: r.title, url: r.url }));

    const fallbackSources = sources.length === 0 ? all.slice(0, 3).map((r) => ({ title: r.title, url: r.url })) : sources;

    return NextResponse.json({
      enabled: true,
      found: true,
      company,
      about: typeof parsed.about === "string" ? parsed.about : "",
      tech: Array.isArray(parsed.tech) ? parsed.tech.slice(0, 10) : [],
      interview: Array.isArray(parsed.interview) ? parsed.interview.slice(0, 8) : [],
      sources: fallbackSources,
    });
  } catch (err) {
    console.error("insights error", err);
    return NextResponse.json({ enabled: true, found: false });
  }
}
