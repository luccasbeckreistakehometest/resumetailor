import { z } from "zod";
import { getDb, newId, nowIso } from "@/lib/server/db";

export const CONTACT_TOPICS = ["account", "payment", "password", "privacy", "bug", "other"] as const;
export const CONTACT_STATUSES = ["new", "open", "done"] as const;

export const contactSchema = z.object({
  name: z.string().trim().max(80).default(""),
  email: z.string().trim().max(200).email(),
  topic: z.enum(CONTACT_TOPICS).default("other"),
  message: z.string().trim().min(10).max(4000),
  lang: z.enum(["en", "pt", "es"]).default("en"),
  // Honeypot: a field people never see. Anything in it means a bot.
  website: z.string().max(200).optional(),
});

export interface ContactRow {
  id: string; userId: string | null; name: string; email: string; topic: string; message: string; lang: string;
  status: string; ip: string | null; createdAt: string; updatedAt: string;
}

export function saveContact(input: Omit<z.infer<typeof contactSchema>, "website"> & { userId: string | null; ip: string }): ContactRow {
  const id = newId("msg");
  const at = nowIso();
  getDb().prepare("INSERT INTO contact_messages (id,userId,name,email,topic,message,lang,status,ip,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, input.userId, input.name, input.email.toLowerCase(), input.topic, input.message, input.lang, "new", input.ip, at, at);
  return getDb().prepare("SELECT * FROM contact_messages WHERE id = ?").get(id) as ContactRow;
}

export function listContacts(status?: string, limit = 200): ContactRow[] {
  const db = getDb();
  return (status
    ? db.prepare("SELECT * FROM contact_messages WHERE status = ? ORDER BY createdAt DESC LIMIT ?").all(status, limit)
    : db.prepare("SELECT * FROM contact_messages ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, createdAt DESC LIMIT ?").all(limit)) as ContactRow[];
}

export function setContactStatus(id: string, status: (typeof CONTACT_STATUSES)[number]): ContactRow | null {
  getDb().prepare("UPDATE contact_messages SET status = ?, updatedAt = ? WHERE id = ?").run(status, nowIso(), id);
  return (getDb().prepare("SELECT * FROM contact_messages WHERE id = ?").get(id) as ContactRow) ?? null;
}
