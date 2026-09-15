import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * The voice the product speaks with is an AI voice, never the browser's. ElevenLabs is the
 * preferred provider (multilingual model handles pt-BR naturally); OpenAI's TTS is the fallback.
 * With neither configured the app stays silent and shows the text — it does not fall back to
 * speechSynthesis on purpose.
 *
 * Every phrase is cached on disk by (provider, lang, text): the opener is identical for every
 * visitor and would otherwise be billed on every session.
 */
const CACHE_DIR = path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "tts");

export type TtsProvider = "elevenlabs" | "openai" | null;

export function ttsProvider(): TtsProvider {
  if (process.env.AI_MOCK === "1") return null;
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

// Multilingual voices that read Portuguese without an accent. Override with ELEVENLABS_VOICE_ID.
const ELEVEN_DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
const OPENAI_VOICES: Record<string, string> = { pt: "nova", en: "alloy", es: "nova" };

export async function synthesise(text: string, lang: string): Promise<Buffer | null> {
  const provider = ttsProvider();
  if (!provider) return null;
  const key = createHash("sha1").update(`${provider}|${lang}|${text}`).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.mp3`);
  if (fs.existsSync(file)) return fs.readFileSync(file);

  let res: Response;
  if (provider === "elevenlabs") {
    const voice = process.env.ELEVENLABS_VOICE_ID ?? ELEVEN_DEFAULT_VOICE;
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 } }),
    });
  } else {
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts", voice: OPENAI_VOICES[lang] ?? "alloy", input: text, response_format: "mp3" }),
    });
  }
  if (!res.ok) throw new Error(`TTS ${provider} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}
