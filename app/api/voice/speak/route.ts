import { NextResponse } from "next/server";
import { z } from "zod";
import { synthesise, ttsProvider } from "@/lib/server/tts";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(600), lang: z.enum(["en", "pt", "es"]).default("en") });

/** Returns the AI voice reading `text`, or 204 when no voice provider is configured. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!ttsProvider()) return new Response(null, { status: 204 });
  try {
    const audio = await synthesise(parsed.data.text, parsed.data.lang);
    if (!audio) return new Response(null, { status: 204 });
    return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch (error) {
    console.error("tts", error);
    return new Response(null, { status: 204 });
  }
}

export async function GET() {
  return NextResponse.json({ provider: ttsProvider() });
}
