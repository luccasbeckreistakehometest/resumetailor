import { listItems, parseResume, plain, splitDates, type Entry } from "@/lib/resume/sections";

/** What application forms ask for, field by field, as plain text ready to paste. No AI. */
export interface FormExperience { title: string; company: string; start: string; end: string; description: string }
export interface FormFields { summary: string; experiences: FormExperience[]; education: string[]; languages: string; skills: string; cover: string }

const bullets = (e: Entry) => e.items.filter((i) => i.text.trim()).map((i) => (i.kind === "bullet" ? `• ${plain(i.text)}` : plain(i.text))).join("\n");

export function formFields(resume: string, cover: string): FormFields {
  const p = parseResume(resume);
  const out: FormFields = { summary: "", experiences: [], education: [], languages: "", skills: "", cover: cover.trim() };
  if (!p) return out;
  for (const s of p.sections) {
    if (s.kind === "summary") out.summary = plain(s.text);
    if (s.kind === "experience" && s.entries) {
      for (const e of s.entries) {
        const [start, end] = splitDates(e.dates);
        out.experiences.push({ title: plain(e.title), company: plain(e.org), start, end, description: bullets(e) });
      }
    }
    if (s.kind === "education") {
      if (s.entries) out.education.push(...s.entries.map((e) => [plain(e.title), plain(e.org), e.dates].filter(Boolean).join(" — ") + (e.items.length ? `\n${bullets(e)}` : "")));
      else if (s.text) out.education.push(...s.text.split("\n").map((l) => plain(l.replace(/^\s*[-*•]\s+/, ""))).filter(Boolean));
    }
    if (s.kind === "languages") out.languages = listItems(s.text).join(", ");
    if (s.kind === "skills") out.skills = listItems(s.text).join(", ");
  }
  return out;
}

/** Everything in one paste, labelled. */
export function formFieldsText(f: FormFields, labels: { summary: string; experience: string; education: string; languages: string; skills: string; cover: string }): string {
  const parts: string[] = [];
  if (f.summary) parts.push(`${labels.summary}\n${f.summary}`);
  if (f.experiences.length) parts.push(`${labels.experience}\n${f.experiences.map((e) => [[e.title, e.company].filter(Boolean).join(" — "), [e.start, e.end].filter(Boolean).join(" – "), e.description].filter(Boolean).join("\n")).join("\n\n")}`);
  if (f.education.length) parts.push(`${labels.education}\n${f.education.join("\n")}`);
  if (f.languages) parts.push(`${labels.languages}\n${f.languages}`);
  if (f.skills) parts.push(`${labels.skills}\n${f.skills}`);
  if (f.cover) parts.push(`${labels.cover}\n${f.cover}`);
  return parts.join("\n\n");
}
