/**
 * A calendar invite (RFC 5545) for an interview or a follow-up reminder, with alarms one day and
 * one hour before. CRLF line ends, lines folded at 75 octets, text escaped.
 */
export const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets (UTF-8), continuation lines start with a space. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    const limit = out.length === 0 ? 75 : 74;       // continuation lines lose one octet to the leading space
    if (bytes + n > limit) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

export interface IcsEvent { uid: string; summary: string; description: string; url?: string; start: Date | string; durationMinutes?: number; now?: Date }

export function buildIcs(e: IcsEvent): string {
  const allDay = typeof e.start === "string";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ResumeTailor//Applications//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(e.now ?? new Date())}`,
    allDay ? `DTSTART;VALUE=DATE:${dateOnly(e.start as string)}` : `DTSTART:${stamp(e.start as Date)}`,
    allDay ? `DTEND;VALUE=DATE:${dateOnly(new Date(Date.parse(`${e.start as string}T12:00:00Z`) + 86_400_000).toISOString())}` : `DTEND:${stamp(new Date((e.start as Date).getTime() + (e.durationMinutes ?? 60) * 60_000))}`,
    `SUMMARY:${escapeIcs(e.summary)}`,
    `DESCRIPTION:${escapeIcs(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeIcs(e.summary)}`, "TRIGGER:-P1D", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeIcs(e.summary)}`, "TRIGGER:-PT1H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
