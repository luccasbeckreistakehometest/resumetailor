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
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 to-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Resume → job match</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
          estimate
        </span>
      </div>

      <div className="mt-4 flex items-end gap-5">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-400 line-through decoration-slate-300">{before}%</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">before</div>
        </div>
        <svg className="mb-2 h-5 w-8 flex-none text-slate-300" viewBox="0 0 32 20" fill="none">
          <path d="M2 10h26m0 0-7-7m7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="text-center">
          <div className="text-4xl font-extrabold text-emerald-600">{after}%</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">after</div>
        </div>
        <div className="flex-1 pb-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${after}%` }} />
          </div>
          {added.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-600">{label(added.length)}</span>
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
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-slate-50 text-slate-400 ring-1 ring-slate-200 line-through")
              }
            >
              {k.after && !k.before && <span className="text-emerald-500">+</span>}
              {k.term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
