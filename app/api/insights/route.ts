import { NextResponse } from "next/server";
import { companyInsights } from "@/lib/ai/insights";
import { aiConfigured } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { jobDescription } = await request.json().catch(() => ({}));
  if (!aiConfigured()) return NextResponse.json({ enabled: false, found: false });
  if (typeof jobDescription !== "string" || jobDescription.length < 30) return NextResponse.json({ enabled: true, found: false });
  try {
    return NextResponse.json(await companyInsights(jobDescription));
  } catch (error) {
    console.error("insights", error);
    return NextResponse.json({ enabled: true, found: false });
  }
}
