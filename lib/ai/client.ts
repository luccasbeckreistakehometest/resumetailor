import Anthropic from "@anthropic-ai/sdk";
import { env, secretEnv } from "@/lib/server/env";

/** The kit is the product's whole value; extraction is mechanical and runs on the cheaper tier. */
export const KIT_MODEL = env("AI_MODEL_KIT") ?? "claude-sonnet-5";
export const EXTRACT_MODEL = env("AI_MODEL_EXTRACT") ?? "claude-sonnet-5";

/** Deterministic fixtures instead of the API: for Playwright runs and demos with no key. */
export const aiMock = () => process.env.AI_MOCK === "1";

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: secretEnv("ANTHROPIC_API_KEY") });
  return client;
}

/** A key is present and not a placeholder. Whether it WORKS is lib/ai/health.ts's job. */
export function aiConfigured(): boolean {
  const key = secretEnv("ANTHROPIC_API_KEY") ?? "";
  return aiMock() || key.length > 20;
}

/** Raised by the fixtures when a test asks for a dead AI; classified like a rejected key. */
export class MockAiDown extends Error { constructor() { super("mock: AI key rejected"); } }
export const MOCK_AI_DOWN = "[[mock-ai-down]]";

export type AiErrorKind = "auth" | "credit" | "rate" | "connection" | "incomplete" | "other";

/**
 * What went wrong, for the operator. Users never see this text: they get a neutral, localized
 * message (lib/ai/guard.ts); this goes to the server log and the admin panel.
 */
export function classifyAiError(error: unknown): { kind: AiErrorKind; detail: string } {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (error instanceof MockAiDown) return { kind: "auth", detail: message };
  if (/credit balance is too low/i.test(message)) return { kind: "credit", detail: "Anthropic account has no credit left (console.anthropic.com → Billing)." };
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { kind: "auth", detail: `ANTHROPIC_API_KEY rejected: ${message}` };
  if (error instanceof Anthropic.RateLimitError || /rate.?limit|overloaded/i.test(message)) return { kind: "rate", detail: `Rate limited / overloaded: ${message}` };
  if (error instanceof Anthropic.APIConnectionError) return { kind: "connection", detail: `Could not reach the AI service: ${message}` };
  if (error instanceof Anthropic.APIError) return { kind: error.status && error.status >= 500 ? "connection" : "other", detail: `AI service error ${error.status ?? ""}: ${message}` };
  if (/incomplete|could not (read|understand)/i.test(message)) return { kind: "incomplete", detail: message };
  return { kind: "other", detail: message || "unknown AI error" };
}

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
};
export function costOf(usage: Anthropic.Usage | undefined, model: string): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-5"];
  return ((usage?.input_tokens ?? 0) * p.input + (usage?.output_tokens ?? 0) * p.output) / 1_000_000;
}
