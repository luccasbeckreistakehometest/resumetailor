import { z } from "zod";
import { withOwner, bad } from "@/lib/server/http";
import { generateKit } from "@/lib/ai/kit";
import { aiConfigured, describeAiError } from "@/lib/ai/client";
import { saveGeneration, serialise } from "@/lib/server/generations";
import { recordEvent } from "@/lib/server/onboarding";

export const runtime = "nodejs";

const schema = z.object({
  mode: z.enum(["tailor", "improve", "build"]),
  targetRole: z.string().max(200).default(""),
  jobDescription: z.string().max(12000).optional(),
  resume: z.string().max(16000).optional(),
  profile: z.string().max(12000).optional(),
  lang: z.enum(["en", "pt", "es"]).default("en"),
  source: z.enum(["text", "voice"]).default("text"),
  briefingId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return bad("Missing fields.");
    const b = parsed.data;
    if (b.mode === "tailor" && ((b.jobDescription ?? "").length < 30 || (b.resume ?? "").length < 30)) return bad("Paste a fuller job description and resume.");
    if (b.mode === "improve" && (b.resume ?? "").length < 30) return bad("Paste your current resume.");
    if (b.mode === "build" && (b.profile ?? "").length < 20) return bad("Tell us a bit more about yourself first.");
    if (!aiConfigured()) return bad("The AI service is not configured yet. Set ANTHROPIC_API_KEY on the server.", 503);
    try {
      const { kit, model, costUsd } = await generateKit(b);
      const row = saveGeneration({
        userId: owner.userId, anonId: owner.anonId, mode: b.mode, source: b.source, lang: b.lang, targetRole: b.targetRole,
        input: { jobDescription: b.jobDescription, resume: b.resume, profile: b.profile, briefingId: b.briefingId }, kit, model, costUsd,
      });
      recordEvent(owner.key, "generate", { mode: b.mode, source: b.source, matchAfter: kit.matchAfter });
      return { body: serialise(row) };
    } catch (error) {
      console.error("generate", error);
      return bad(describeAiError(error), 502);
    }
  });
}
