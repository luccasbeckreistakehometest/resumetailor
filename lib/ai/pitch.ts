import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Kit, Lang } from "@/lib/ai/kit";
import { targetWords, type Delivery } from "@/lib/speech/metrics";

/**
 * The video-introduction pitch: a script written for speaking (one cheap call, cached per kit and
 * length), a no-AI template for locked kits, and optional feedback on a take — from the transcript
 * and the delivery numbers only. The video itself never leaves the person's device.
 */
export const PITCH_SECONDS = [60, 90, 120] as const;
export type PitchSeconds = (typeof PITCH_SECONDS)[number];
export const isPitchSeconds = (n: number): n is PitchSeconds => (PITCH_SECONDS as readonly number[]).includes(n);

export const PitchSchema = z.object({ script: z.string(), hook: z.string(), proofs: z.array(z.string()), close: z.string() });
export type Pitch = z.infer<typeof PitchSchema>;
export const FeedbackSchema = z.object({ score: z.number(), hook: z.string(), evidence: z.string(), close: z.string(), oneFix: z.string() });
export type PitchFeedback = z.infer<typeof FeedbackSchema>;

const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };
const firstName = (title: string) => title.split(/\s+/)[0] ?? "";

/** A script assembled without AI from what the kit already says (locked kits). */
export function templatePitch(kit: Pick<Kit, "emphasis">, title: string, role: string, lang: Lang, seconds: PitchSeconds): Pitch {
  const name = firstName(title);
  const proofs = kit.emphasis.slice(0, seconds >= 90 ? 3 : 2);
  const t = {
    en: { hook: `Hi, I'm ${name}, and I'm applying for ${role || "this role"}.`, bridge: "Two things I'd bring from day one:", close: "I'd love to show you how that would work on your team. Thank you." },
    pt: { hook: `Oi, eu sou ${name} e estou me candidatando pra vaga de ${role || "vocês"}.`, bridge: "Duas coisas que eu levo desde o primeiro dia:", close: "Adoraria mostrar como isso funciona no time de vocês. Obrigado!" },
    es: { hook: `Hola, soy ${name} y postulo al puesto de ${role || "ustedes"}.`, bridge: "Dos cosas que aporto desde el primer día:", close: "Me encantaría mostrarles cómo funcionaría en su equipo. ¡Gracias!" },
  }[lang];
  const script = [t.hook, t.bridge, ...proofs.map((p) => `${p}.`), t.close].join("\n\n");
  return { script, hook: t.hook, proofs, close: t.close };
}

export function mockPitch(title: string, role: string, lang: Lang, seconds: PitchSeconds): Pitch {
  const p = templatePitch({ emphasis: ["Pipeline growth of 38% YoY", "Leading a cross-functional team of four"] }, title, role, lang, seconds);
  return { ...p, script: `${p.script}\n\n[demo · ${seconds}s]` };
}

export async function generatePitch(a: { kit: Kit; title: string; role: string; posting: string; lang: Lang; seconds: PitchSeconds }): Promise<{ pitch: Pitch; model: string; costUsd: number }> {
  if (aiMock()) return { pitch: mockPitch(a.title, a.role, a.lang, a.seconds), model: "mock", costUsd: 0 };
  const words = targetWords(a.seconds);
  const response = await getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 1200,
    system: `You write a spoken video-introduction pitch (the "tell us about yourself" video step of a hiring process) in ${LANG_NAME[a.lang]}, about ${words} words for ${a.seconds} seconds. Structure: a one-sentence hook with name and role; two or three proofs taken ONLY from the résumé (numbers exactly as written there); one sentence on why this role or company, using the posting; a warm close. Short sentences, easy to say out loud, first person, no Markdown, no stage directions, no invented facts. "script" is the full text with a blank line between parts; hook, proofs and close repeat those parts.`,
    messages: [{ role: "user", content: `NAME: ${a.title}\nROLE: ${a.role}\n\nRÉSUMÉ:\n${a.kit.resume.slice(0, 3500)}\n\nEMPHASISE: ${a.kit.emphasis.join("; ")}\n\nPOSTING:\n${(a.posting || "(no posting)").slice(0, 2500)}` }],
    output_config: { format: zodOutputFormat(PitchSchema) },
  }).finalMessage();
  const p = response.parsed_output as Pitch | null;
  if (!p) throw new Error("incomplete: the pitch came back unparsed");
  return { pitch: { ...p, script: p.script.slice(0, 3000), proofs: p.proofs.slice(0, 4) }, model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}

export function mockFeedback(d: Delivery, lang: Lang): PitchFeedback {
  const m = {
    en: { hook: "Clear opening with your name and the role. [demo]", evidence: "One concrete number — good.", close: "Ends warmly.", fix: "Cut the filler words before the first proof." },
    pt: { hook: "Abertura clara com nome e vaga. [demo]", evidence: "Um número concreto — ótimo.", close: "Fecha de um jeito caloroso.", fix: "Corta os “né” antes da primeira prova." },
    es: { hook: "Apertura clara con nombre y puesto. [demo]", evidence: "Un número concreto — bien.", close: "Cierra con calidez.", fix: "Quita las muletillas antes de la primera prueba." },
  }[lang];
  return { score: Math.max(4, 9 - Math.round(d.fillersPer100 / 2)), hook: m.hook, evidence: m.evidence, close: m.close, oneFix: m.fix };
}

export async function pitchFeedback(a: { transcript: string; delivery: Delivery; seconds: number; lang: Lang; role: string }): Promise<{ feedback: PitchFeedback; model: string; costUsd: number }> {
  if (aiMock()) return { feedback: mockFeedback(a.delivery, a.lang), model: "mock", costUsd: 0 };
  const response = await getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 700,
    system: `You coach a candidate's recorded video introduction for the role "${a.role}". Judge only what is in the transcript and the numbers. Reply in ${LANG_NAME[a.lang]}: score 0-10 (integer), one sentence each on the hook, the evidence and the close, and oneFix — the single most useful change for the next take. Be specific and kind; no generic advice.`,
    messages: [{ role: "user", content: `TARGET LENGTH: ${a.seconds}s\nDELIVERY: ${a.delivery.wpm} words/min, ${a.delivery.fillers} filler words (${a.delivery.fillersPer100}/100 words), ${a.delivery.seconds}s spoken\n\nTRANSCRIPT:\n${a.transcript.slice(0, 4000)}` }],
    output_config: { format: zodOutputFormat(FeedbackSchema) },
  }).finalMessage();
  const f = response.parsed_output as PitchFeedback | null;
  if (!f) throw new Error("incomplete: the feedback came back unparsed");
  return { feedback: { ...f, score: Math.max(0, Math.min(10, Math.round(f.score))) }, model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
