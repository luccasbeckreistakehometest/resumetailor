/**
 * Server-side env access. Two production traps are handled here, once:
 *  - docker's env_file keeps an inline "# comment" written after an EMPTY value as the value
 *    itself, so a key that "starts with #" is treated as unset;
 *  - .env.example placeholders ("sk_live_...", "change-me…") must never count as configured.
 * Client code cannot use this (NEXT_PUBLIC_* are inlined only when written literally).
 */
const PLACEHOLDER = /\.\.\.|^change-me|your-domain\.com|^choose-a-/i;

export function env(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (!value || value.startsWith("#")) return undefined;
  return value;
}

/** A credential: unset when empty, a comment, or an example placeholder. */
export function secretEnv(name: string): string | undefined {
  const value = env(name);
  return value && !PLACEHOLDER.test(value) ? value : undefined;
}

export function envNumber(name: string, fallback: number): number {
  const value = env(name);
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const isProduction = () => process.env.NODE_ENV === "production";

/**
 * The public origin (no trailing slash). Checkout return URLs and payment notifications are
 * built from this and never from the request's Origin header.
 */
export function baseUrl(): string {
  const value = env("NEXT_PUBLIC_BASE_URL") ?? env("BASE_URL");
  if (value && !PLACEHOLDER.test(value)) return value.replace(/\/+$/, "");
  return `http://localhost:${env("PORT") ?? "3000"}`;
}

/** Optional contact channels shown to visitors. Nothing renders when they are unset. */
export function supportContacts(): { email: string | null; whatsapp: string | null } {
  const email = env("SUPPORT_EMAIL") ?? env("NEXT_PUBLIC_SUPPORT_EMAIL") ?? null;
  const rawWa = env("SUPPORT_WHATSAPP") ?? env("NEXT_PUBLIC_SUPPORT_WHATSAPP") ?? "";
  const digits = rawWa.replace(/\D/g, "");
  // 5511999999999 is the old .env.example placeholder: a stranger's (or nobody's) number.
  const whatsapp = digits.length >= 10 && digits !== "5511999999999" ? digits : null;
  return { email: email && /.+@.+\..+/.test(email) && !PLACEHOLDER.test(email) ? email : null, whatsapp };
}

/** The seller's identity for the legal pages. Only what is set is shown; nothing is invented. */
export function legalIdentity(): { name: string | null; document: string | null; address: string | null; email: string | null } {
  return {
    name: env("LEGAL_NAME") ?? null,
    document: env("LEGAL_DOCUMENT") ?? null,
    address: env("LEGAL_ADDRESS") ?? null,
    email: env("LEGAL_EMAIL") ?? null,
  };
}
