import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/server/db";
import { envNumber, secretEnv } from "@/lib/server/env";
import { extra } from "@/app/i18n/extra";

/**
 * The voice the product speaks with is an AI voice, never the browser's. ElevenLabs is the
 * preferred provider (multilingual model handles pt-BR naturally); OpenAI's TTS is the fallback.
 * With neither configured the app stays silent and shows the text — it does not fall back to
 * speechSynthesis on purpose.
 *
 * Every phrase is cached on disk by (provider, lang, text) — the opener is identical for every
 * visitor — and the cache is bounded: least recently used files go first (TTS_CACHE_MAX_MB).
 */
const cacheDir = () => path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "tts");

export type TtsProvider = "elevenlabs" | "openai" | null;

export function ttsProvider(): TtsProvider {
  if (process.env.AI_MOCK === "1") return null;
  if (secretEnv("ELEVENLABS_API_KEY")) return "elevenlabs";
  if (secretEnv("OPENAI_API_KEY")) return "openai";
  return null;
}

// Multilingual voices that read Portuguese without an accent. Override with ELEVENLABS_VOICE_ID.
const ELEVEN_DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
const OPENAI_VOICES: Record<string, string> = { pt: "nova", en: "alloy", es: "nova" };

const norm = (t: string) => t.replace(/\s+/g, " ").trim();

/** The fixed lines the app itself speaks, in every language. */
export function staticPrompts(): Set<string> {
  const out = new Set<string>();
  for (const lang of ["en", "pt", "es"] as const) {
    out.add(norm(extra[lang].voice.opener));
    out.add(norm(extra[lang].voice.ready));
  }
  return out;
}

/**
 * Only text the app produced for THIS visitor can be spoken: the fixed prompts, the follow-up
 * questions of their own voice briefings, and the questions of their own mock interviews. That
 * keeps the endpoint from being a free text-to-speech service billed to the owner.
 */
export function isAppPrompt(text: string, owner: { userId: string | null; anonId: string }): boolean {
  const t = norm(text);
  if (!t) return false;
  if (staticPrompts().has(t)) return true;
  const db = getDb();
  const keys = [owner.userId, owner.anonId].filter(Boolean) as string[];
  if (keys.length) {
    const rows = db.prepare(`SELECT extracted FROM voice_briefings WHERE ownerId IN (${keys.map(() => "?").join(",")}) ORDER BY createdAt DESC LIMIT 30`).all(...keys) as { extracted: string }[];
    for (const r of rows) {
      try { if (norm((JSON.parse(r.extracted) as { followUp?: string }).followUp ?? "") === t) return true; } catch {}
    }
  }
  const sessions = (owner.userId
    ? db.prepare("SELECT questions FROM interview_sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 30").all(owner.userId)
    : owner.anonId ? db.prepare("SELECT questions FROM interview_sessions WHERE anonId = ? AND userId IS NULL ORDER BY createdAt DESC LIMIT 30").all(owner.anonId) : []) as { questions: string }[];
  for (const s of sessions) {
    try {
      const qs = JSON.parse(s.questions) as { text: string }[];
      if (qs.some((q) => norm(q.text.slice(0, 600)) === t || norm(q.text) === t)) return true;
    } catch {}
  }
  return false;
}

export const cacheKey = (provider: string, lang: string, text: string) => createHash("sha1").update(`${provider}|${lang}|${text}`).digest("hex");

/** A cached phrase, or null. A hit refreshes its place in the LRU order. */
export function readCached(key: string, now = Date.now()): Buffer | null {
  const file = path.join(cacheDir(), `${key}.mp3`);
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  getDb().prepare("INSERT INTO tts_cache (key, bytes, lastUsedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET lastUsedAt = excluded.lastUsedAt").run(key, buf.length, now);
  return buf;
}

export function writeCached(key: string, buf: Buffer, now = Date.now()): void {
  fs.mkdirSync(cacheDir(), { recursive: true });
  fs.writeFileSync(path.join(cacheDir(), `${key}.mp3`), buf);
  getDb().prepare("INSERT INTO tts_cache (key, bytes, lastUsedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET bytes = excluded.bytes, lastUsedAt = excluded.lastUsedAt").run(key, buf.length, now);
  evict(envNumber("TTS_CACHE_MAX_MB", 200) * 1024 * 1024);
}

/** Deletes least-recently-used files until the cache fits in `maxBytes`. */
export function evict(maxBytes: number): number {
  const db = getDb();
  let total = (db.prepare("SELECT COALESCE(SUM(bytes), 0) b FROM tts_cache").get() as { b: number }).b;
  let removed = 0;
  if (total <= maxBytes) return 0;
  const rows = db.prepare("SELECT key, bytes FROM tts_cache ORDER BY lastUsedAt ASC").all() as { key: string; bytes: number }[];
  for (const r of rows) {
    if (total <= maxBytes) break;
    try { fs.rmSync(path.join(cacheDir(), `${r.key}.mp3`), { force: true }); } catch {}
    db.prepare("DELETE FROM tts_cache WHERE key = ?").run(r.key);
    total -= r.bytes; removed++;
  }
  return removed;
}

/** Calls the provider (no cache, no checks — the route does both). */
export async function synthesise(text: string, lang: string): Promise<Buffer | null> {
  const provider = ttsProvider();
  if (!provider) return null;
  let res: Response;
  if (provider === "elevenlabs") {
    const voice = secretEnv("ELEVENLABS_VOICE_ID") ?? ELEVEN_DEFAULT_VOICE;
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": secretEnv("ELEVENLABS_API_KEY")!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 } }),
      signal: AbortSignal.timeout(20_000),
    });
  } else {
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretEnv("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: secretEnv("OPENAI_TTS_MODEL") ?? "gpt-4o-mini-tts", voice: OPENAI_VOICES[lang] ?? "alloy", input: text, response_format: "mp3" }),
      signal: AbortSignal.timeout(20_000),
    });
  }
  if (!res.ok) throw new Error(`TTS ${provider} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
