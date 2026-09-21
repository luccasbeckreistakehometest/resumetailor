"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import { blankEntry, type Entry, type ParsedResume, type Section } from "@/lib/resume/sections";
import { Button, Icon, Input, Textarea } from "@/components/ui";

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
    <div className="flex flex-col gap-[var(--s-7)]" data-testid="editor-sections">
      <div>
        <label className="eyebrow block" htmlFor="ed-name">{E.name}</label>
        <Input id="ed-name" className="mt-[var(--s-2)]" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} data-testid="ed-name" />
        <label className="eyebrow mt-[var(--s-5)] block" htmlFor="ed-contact">{E.contact}</label>
        <Textarea id="ed-contact" className="mt-[var(--s-2)]" rows={2} value={value.contact} onChange={(e) => onChange({ ...value, contact: e.target.value })} />
      </div>
      {value.sections.map((s, i) => (
        <div key={i} data-testid="ed-section" data-kind={s.kind}>
          {/* The section heading edits in place, set the way it prints. */}
          <input
            aria-label={E.heading}
            className="w-full border-0 border-b border-[var(--rule)] bg-transparent pb-[var(--s-2)] font-sans text-[length:var(--ui-13)] font-bold uppercase tracking-[var(--ui-11c-ls)] text-[color:var(--ink)] outline-none focus-visible:border-[var(--ink)]"
            value={s.heading}
            onChange={(e) => setSection(i, { ...s, heading: e.target.value })}
          />
          {s.entries ? (
            <div className="mt-3 space-y-4">
              {s.entries.map((en, k) => (
                <EntryCard key={k} entry={en} first={k === 0} last={k === s.entries!.length - 1}
                  onChange={(next) => setSection(i, { ...s, entries: s.entries!.map((x, j) => (j === k ? next : x)) })}
                  onRemove={() => setSection(i, { ...s, entries: s.entries!.filter((_, j) => j !== k) })}
                  onMove={(dir) => { const list = [...s.entries!]; const t = k + dir; [list[k], list[t]] = [list[t], list[k]]; setSection(i, { ...s, entries: list }); }} />
              ))}
              <Button variant="outline" size="sm" onClick={() => setSection(i, { ...s, entries: [...s.entries!, blankEntry(s.entries![s.entries!.length - 1])] })}>{E.addEntry}</Button>
            </div>
          ) : (
            <Textarea aria-label={`${s.heading} — ${E.text}`} className="mt-[var(--s-4)]" rows={Math.min(10, Math.max(2, s.text.split("\n").length + 1))} value={s.text} onChange={(e) => setSection(i, { ...s, text: e.target.value })} data-testid="ed-text" />
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
    <div className="border-l-2 border-[var(--rule)] pl-[var(--s-4)]" data-testid="ed-entry">
      <div className="grid gap-[var(--s-2)] sm:grid-cols-[1fr_1fr_9rem]">
        <Input aria-label={E.role} placeholder={E.role} value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} data-testid="ed-title" />
        <Input aria-label={E.org} placeholder={E.org} value={entry.org} onChange={(e) => onChange({ ...entry, org: e.target.value })} data-testid="ed-org" />
        <Input aria-label={E.dates} placeholder={E.dates} className="font-mono text-[length:var(--mn-13)]" value={entry.dates} onChange={(e) => onChange({ ...entry, dates: e.target.value })} />
      </div>
      <ul className="mt-2 space-y-1.5">
        {entry.items.map((it, k) => (
          <li key={k} className="flex items-start gap-[var(--s-2)]">
            <span className="mt-[10px] shrink-0 font-mono text-[length:var(--mn-13)] text-[color:var(--ink-40)]" aria-hidden>{it.kind === "bullet" ? "•" : "¶"}</span>
            <Textarea aria-label={E.bullet} rows={Math.max(1, Math.ceil(it.text.length / 90))} value={it.text} onChange={(e) => setItem(k, e.target.value)} data-testid="ed-bullet" />
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label={E.up} className="px-[2px] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:text-[color:var(--ink-40)]" disabled={k === 0} onClick={() => moveItem(k, -1)}><Icon name="chevron-down" size={16} className="rotate-180" /></button>
              <button type="button" aria-label={E.down} className="px-[2px] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:text-[color:var(--ink-40)]" disabled={k === entry.items.length - 1} onClick={() => moveItem(k, 1)}><Icon name="chevron-down" size={16} /></button>
            </div>
            <button type="button" aria-label={E.remove} className="mt-[6px] shrink-0 text-[color:var(--ink-muted)] hover:text-[color:var(--mark)]" onClick={() => onChange({ ...entry, items: entry.items.filter((_, j) => j !== k) })}><Icon name="close" size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-4)] font-sans text-[length:var(--ui-12)]">
        <button type="button" className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" onClick={() => onChange({ ...entry, items: [...entry.items, { kind: "bullet", text: "", marker: entry.items.find((i) => i.kind === "bullet")?.marker ?? "- " }] })} data-testid="ed-add-bullet">{E.addBullet}</button>
        <span className="flex-1" />
        <button type="button" className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:text-[color:var(--ink-40)]" disabled={first} onClick={() => onMove(-1)}>{E.up}</button>
        <button type="button" className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:text-[color:var(--ink-40)]" disabled={last} onClick={() => onMove(1)}>{E.down}</button>
        <button type="button" className="text-[color:var(--ink-muted)] hover:text-[color:var(--mark)]" onClick={onRemove}>{E.remove}</button>
      </div>
    </div>
  );
}
