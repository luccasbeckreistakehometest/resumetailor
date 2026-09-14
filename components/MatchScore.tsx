export type Keyword = { term: string; before: boolean; after: boolean };

export function MatchScore({
  before,
  after,
  keywords,
  addedLabel,
}: {
  before: number;
  after: number;
  keywords: Keyword[];
  addedLabel?: (n: number) => string;
}) {
  const added = keywords.filter((k) => k.after && !k.before);
  const shown = keywords.slice(0, 10);
  const label = addedLabel ?? ((n: number) => `+${n} keywords added that the job screens for.`);
  return (
    <div className="rounded-xl border border-edge bg-gradient-to-br from-gold-2/60 to-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-2">Resume → job match</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-edge">
          estimate
        </span>
      </div>

      <div className="mt-4 flex items-end gap-5">
        <div className="text-center">
          <div className="text-3xl font-bold text-muted line-through decoration-edge-2">{before}%</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">before</div>
        </div>
        <svg className="mb-2 h-5 w-8 flex-none text-paper-2" viewBox="0 0 32 20" fill="none">
          <path d="M2 10h26m0 0-7-7m7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-center">
          <div className="text-4xl font-extrabold text-moss">{after}%</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-moss">after</div>
        </div>
        <div className="flex-1 pb-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${after}%` }} />
          </div>
          {added.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              <span className="font-semibold text-moss">{label(added.length)}</span>
            </p>
          )}
        </div>
      </div>

      {shown.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {shown.map((k) => (
            <span
              key={k.term}
              className={
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
                (k.after
                  ? "bg-moss-2 text-moss ring-1 ring-moss/30"
                  : "bg-paper text-muted ring-1 ring-edge line-through")
              }
            >
              {k.after && !k.before && <span className="text-moss">+</span>}
              {k.term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
