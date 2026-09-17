"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { blankEntry, type Entry, type ParsedResume, type Section } from "@/lib/resume/sections";

/**
 * One card per section: entries with title / org / dates and a bullet list (add, remove, move up
 * and down with buttons — no drag library), plain text for the rest. Controlled: every change
 * hands back a new ParsedResume.
 */
export function ResumeEditor({ value, onChange }: { value: ParsedResume; onChange: (next: ParsedResume) => void }) {
  const { r } = useI18n();
  const E = r.editor;
  const setSection = (i: number, s: Section) => onChange({ ...value, sections: value.sections.map((x, j) => (j === i ? s : x)) });

  return (
    <div className="space-y-4" data-testid="editor-sections">
      <div className="card p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="ed-name">{E.name}</label>
        <input id="ed-name" className="field mt-1" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} data-testid="ed-name" />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="ed-contact">{E.contact}</label>
        <textarea id="ed-contact" className="field mt-1" rows={2} value={value.contact} onChange={(e) => onChange({ ...value, contact: e.target.value })} />
      </div>
      {value.sections.map((s, i) => (
        <div key={i} className="card p-4" data-testid="ed-section" data-kind={s.kind}>
          <input aria-label={E.heading} className="w-full border-0 bg-transparent font-display text-xl text-ink outline-none focus:ring-0" value={s.heading} onChange={(e) => setSection(i, { ...s, heading: e.target.value })} />
          {s.entries ? (
            <div className="mt-3 space-y-4">
              {s.entries.map((en, k) => (
                <EntryCard key={k} entry={en} first={k === 0} last={k === s.entries!.length - 1}
                  onChange={(next) => setSection(i, { ...s, entries: s.entries!.map((x, j) => (j === k ? next : x)) })}
                  onRemove={() => setSection(i, { ...s, entries: s.entries!.filter((_, j) => j !== k) })}
                  onMove={(dir) => { const list = [...s.entries!]; const t = k + dir; [list[k], list[t]] = [list[t], list[k]]; setSection(i, { ...s, entries: list }); }} />
              ))}
              <button type="button" className="text-sm font-semibold text-oxblood" onClick={() => setSection(i, { ...s, entries: [...s.entries!, blankEntry(s.entries![s.entries!.length - 1])] })}>{E.addEntry}</button>
            </div>
          ) : (
            <textarea aria-label={`${s.heading} — ${E.text}`} className="field mt-2" rows={Math.min(10, Math.max(2, s.text.split("\n").length + 1))} value={s.text} onChange={(e) => setSection(i, { ...s, text: e.target.value })} data-testid="ed-text" />
          )}
        </div>
      ))}
    </div>
  );
}

function EntryCard({ entry, first, last, onChange, onRemove, onMove }: { entry: Entry; first: boolean; last: boolean; onChange: (e: Entry) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void }) {
  const { r } = useI18n();
  const E = r.editor;
  const setItem = (k: number, text: string) => onChange({ ...entry, items: entry.items.map((it, j) => (j === k ? { ...it, text } : it)) });
  const moveItem = (k: number, dir: -1 | 1) => { const list = [...entry.items]; const t = k + dir; if (t < 0 || t >= list.length) return; [list[k], list[t]] = [list[t], list[k]]; onChange({ ...entry, items: list }); };
  return (
    <div className="rounded-xl border border-edge bg-paper p-3" data-testid="ed-entry">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_9rem]">
        <input aria-label={E.role} placeholder={E.role} className="field !py-1.5" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} data-testid="ed-title" />
        <input aria-label={E.org} placeholder={E.org} className="field !py-1.5" value={entry.org} onChange={(e) => onChange({ ...entry, org: e.target.value })} data-testid="ed-org" />
        <input aria-label={E.dates} placeholder={E.dates} className="field !py-1.5" value={entry.dates} onChange={(e) => onChange({ ...entry, dates: e.target.value })} />
      </div>
      <ul className="mt-2 space-y-1.5">
        {entry.items.map((it, k) => (
          <li key={k} className="flex items-start gap-1.5">
            <span className="mt-2.5 text-muted" aria-hidden>{it.kind === "bullet" ? "•" : "¶"}</span>
            <textarea aria-label={E.bullet} rows={Math.max(1, Math.ceil(it.text.length / 90))} className="field !py-1.5 text-sm" value={it.text} onChange={(e) => setItem(k, e.target.value)} data-testid="ed-bullet" />
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label={E.up} className="px-1 text-xs text-muted hover:text-ink disabled:opacity-30" disabled={k === 0} onClick={() => moveItem(k, -1)}>▲</button>
              <button type="button" aria-label={E.down} className="px-1 text-xs text-muted hover:text-ink disabled:opacity-30" disabled={k === entry.items.length - 1} onClick={() => moveItem(k, 1)}>▼</button>
            </div>
            <button type="button" aria-label={E.remove} className="px-1 pt-2 text-sm text-muted hover:text-oxblood" onClick={() => onChange({ ...entry, items: entry.items.filter((_, j) => j !== k) })}>✕</button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="font-semibold text-oxblood" onClick={() => onChange({ ...entry, items: [...entry.items, { kind: "bullet", text: "", marker: entry.items.find((i) => i.kind === "bullet")?.marker ?? "- " }] })} data-testid="ed-add-bullet">{E.addBullet}</button>
        <span className="flex-1" />
        <button type="button" className="text-muted hover:text-ink disabled:opacity-30" disabled={first} onClick={() => onMove(-1)}>▲ {E.up}</button>
        <button type="button" className="text-muted hover:text-ink disabled:opacity-30" disabled={last} onClick={() => onMove(1)}>▼ {E.down}</button>
        <button type="button" className="text-muted hover:text-oxblood" onClick={onRemove}>{E.remove}</button>
      </div>
    </div>
  );
}
