import { NextResponse } from "next/server";
import { z } from "zod";
import { cacheKey, isAppPrompt, readCached, synthesise, ttsProvider, writeCached } from "@/lib/server/tts";
import { anonId, currentUser } from "@/lib/server/session";
import { requestIp } from "@/lib/server/http";
import { take } from "@/lib/server/ratelimit";
import { isAnonymousKey, overBudget, recordUsage, ttsCost } from "@/lib/server/spend";

export const runtime = "nodejs";

const schema = z.object({ text: z.string().min(1).max(600), lang: z.enum(["en", "pt", "es"]).default("en") });
const silent = () => new Response(null, { status: 204 });

/**
 * The AI voice reading one of the app's own prompts, or 204 (the client then just shows the
 * text). Refused without an owner cookie, for text the app did not produce for this visitor,
 * past the per-owner / per-IP caps, and once the daily AI spend ceiling is reached.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const provider = ttsProvider();
  if (!provider) return silent();
  const user = await currentUser();
  const anon = await anonId();
  if (!user && !anon) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const owner = { userId: user?.id ?? null, anonId: anon ?? "" };
  const { text, lang } = parsed.data;
  if (!isAppPrompt(text, owner)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const key = cacheKey(provider, lang, text);
  const cached = readCached(key);
  if (cached) return audio(cached);

  const ip = await requestIp();
  const ownerKey = owner.userId ?? owner.anonId;
  if (!take("SPEAK_IP_DAY", ip).ok || !take("SPEAK_OWNER_DAY", ownerKey).ok) return silent();
  if (overBudget({ anonymous: isAnonymousKey(owner.userId) })) return silent();
  try {
    const buf = await synthesise(text, lang);
    if (!buf) return silent();
    writeCached(key, buf);
    recordUsage({ feature: "tts", ownerKey, ip, model: provider, costUsd: ttsCost(text.length) });
    return audio(buf);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[tts]", detail);
    recordUsage({ feature: "tts", ownerKey, ip, model: provider, ok: false, error: detail });
    return silent();
  }
}

const audio = (buf: Buffer) => new Response(new Uint8Array(buf), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });

export async function GET() {
  return NextResponse.json({ provider: ttsProvider() });
}
