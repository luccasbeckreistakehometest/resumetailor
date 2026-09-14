import Anthropic from "@anthropic-ai/sdk";

/** The kit is the product's whole value; extraction is mechanical and runs on the cheaper tier. */
export const KIT_MODEL = process.env.AI_MODEL_KIT ?? "claude-sonnet-5";
export const EXTRACT_MODEL = process.env.AI_MODEL_EXTRACT ?? "claude-sonnet-5";

/** Deterministic fixtures instead of the API: for Playwright runs and demos with no key. */
export const aiMock = () => process.env.AI_MOCK === "1";

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function aiConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  return aiMock() || (key.length > 20 && !key.includes("..."));
}

/** Turns SDK failures into a sentence a paying user can act on. */
export function describeAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/credit balance is too low/i.test(message)) return "The AI account has no credit left. Top it up at console.anthropic.com → Billing.";
  if (error instanceof Anthropic.AuthenticationError) return "The AI key was rejected. Replace ANTHROPIC_API_KEY and restart.";
  if (error instanceof Anthropic.RateLimitError || /rate.?limit/i.test(message)) return "Too many requests right now. Wait a moment and try again.";
  if (error instanceof Anthropic.APIConnectionError) return "Could not reach the AI service. Check the connection and retry.";
  if (error instanceof Anthropic.APIError) return `AI service error ${error.status ?? ""}: ${error.message}`;
  return message || "Something went wrong.";
}

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
};
export function costOf(usage: Anthropic.Usage | undefined, model: string): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-5"];
  return ((usage?.input_tokens ?? 0) * p.input + (usage?.output_tokens ?? 0) * p.output) / 1_000_000;
}
