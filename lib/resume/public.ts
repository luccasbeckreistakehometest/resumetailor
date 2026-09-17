/**
 * The public web résumé: what can be shown to whom. Pure rules, unit-tested; the storage and
 * the PIN hashing live in lib/server/publicResumes.ts.
 */
export const TEMPLATES = ["ats", "modern", "elegant", "compact", "bold"] as const;
export type Template = (typeof TEMPLATES)[number];
export const isTemplate = (t: unknown): t is Template => typeof t === "string" && (TEMPLATES as readonly string[]).includes(t);

export type Access = "missing" | "off" | "pin" | "ok";

/**
 * A page is reachable when it exists and is switched on; a PIN, when set, must have been verified
 * for this browser — except for the owner, who never has to type their own PIN.
 */
export function decideAccess(row: { enabled: boolean; hasPin: boolean } | null, pinVerified: boolean, isOwner = false): Access {
  if (!row) return "missing";
  if (!row.enabled) return "off";
  if (row.hasPin && !pinVerified && !isOwner) return "pin";
  return "ok";
}

/** "Maria de Souza Júnior" → "maria-de-souza-junior"; the caller appends a random suffix so two Marias never collide. */
export function slugify(text: string): string {
  const s = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return s || "cv";
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?:\(?\+?\d[\d ().-]{7,}\d\)?)/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+|(?:linkedin\.com|github\.com|behance\.net|dribbble\.com)\/\S+/gi;

/**
 * Contact details off a résumé that is public on the open web: emails, phone numbers and profile
 * links go, the rest stays. A line left with only separators disappears with them.
 */
export function stripContact(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      const had = EMAIL.test(line) || PHONE.test(line) || URL_RE.test(line);
      EMAIL.lastIndex = PHONE.lastIndex = URL_RE.lastIndex = 0;
      if (!had) return line;
      const cleaned = line.replace(EMAIL, "").replace(URL_RE, "").replace(PHONE, "").replace(/\(\s*\)/g, "")
        // a run of separators left behind ("Lead ·  ·  · SP") collapses to one; separators at the edges go
        .replace(/\s*([·•|,;/])(?:\s*[·•|,;/])+\s*/g, (_, sep: string) => (sep === "," || sep === ";" ? `${sep} ` : ` ${sep} `))
        .replace(/^\s*[·•|,;/]+\s*/, "").replace(/\s*[·•|,;/]+\s*$/, "").replace(/[ \t]{2,}/g, " ").trim();
      return /^[\s#*_·•|,;/()-]*$/.test(cleaned) ? null : cleaned;
    })
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export const PIN_RULE = /^[A-Za-z0-9]{4,12}$/;
