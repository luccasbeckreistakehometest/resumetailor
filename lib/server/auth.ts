import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rt_session";
export const ANON_COOKIE = "rt_anon";
const SESSION_DAYS = 30;
const KNOWN_EXAMPLES = new Set(["change-me-to-a-long-random-string", "test-secret-that-is-long-enough"]);

/**
 * The HMAC key for sessions and PIN cookies. There is no fallback: without it nothing can be
 * signed. Production additionally refuses short or example values. Read lazily, so `next build`
 * never needs it.
 */
export function authSecret(): string {
  const value = (process.env.AUTH_SECRET ?? "").trim();
  const prod = process.env.NODE_ENV === "production";
  if (!value || value.startsWith("#") || value.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short — generate one with `openssl rand -hex 32`.");
  }
  if (prod && (value.length < 32 || KNOWN_EXAMPLES.has(value))) {
    throw new Error("AUTH_SECRET is too weak for production — generate one with `openssl rand -hex 32`.");
  }
  return value;
}

const scryptAsync = (password: string, salt: string, len: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, len, (err, key) => (err ? reject(err) : resolve(key))));

/** scrypt runs on libuv's pool, so a burst of logins or PIN tries never blocks the event loop. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scryptAsync(password, salt, 32)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const candidate = await scryptAsync(password, salt, 32);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

/** Constant-time comparison of two strings of any length. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/** `sv` is the user's session version: bumping it in the database signs every device out. */
export interface SessionPayload { userId: string; role: "user" | "admin"; sv: number; exp: number }

const sign = (body: string) => createHmac("sha256", authSecret()).update(body).digest("base64url");

export function signSession(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + SESSION_DAYS * 86_400_000 };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(signature, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    return payload.exp > Date.now() ? { ...payload, sv: Number(payload.sv ?? 0) } : null;
  } catch {
    return null;
  }
}

export const newAnonId = () => `anon_${randomBytes(12).toString("hex")}`;

/** A readable one-time password for admin resets: no ambiguous characters. */
export function oneTimePassword(length = 14): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
