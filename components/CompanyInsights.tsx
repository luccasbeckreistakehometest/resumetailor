"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";

type Insights = {
  enabled: boolean;
  found?: boolean;
  company?: string;
  about?: string;
  tech?: string[];
  interview?: string[];
  sources?: { title: string; url: string }[];
};

export function CompanyInsights({ jobDescription }: { jobDescription: string }) {
  const { d } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobDescription]);

  // Nothing to show: feature off, or no usable info found.
  if (!loading && (!data || !data.enabled || !data.found)) return null;

  const hasContent = data && (data.about || (data.tech && data.tech.length) || (data.interview && data.interview.length));

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          {d.insights.loading}
        </div>
      </div>
    );
  }

  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div className="flex items-center gap-2">
        <span className="text-base">🔎</span>
        <h3 className="text-sm font-semibold text-slate-800">
          {d.insights.title}
          {data?.company ? ` · ${data.company}` : ""}
        </h3>
      </div>

      {data?.about && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{d.insights.aboutLabel}</div>
          <p className="mt-1 text-sm text-slate-700">{data.about}</p>
        </div>
      )}

      {data?.tech && data.tech.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{d.insights.techLabel}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.tech.map((t) => (
              <span key={t} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {data?.interview && data.interview.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{d.insights.processLabel}</div>
          <ul className="mt-1 space-y-1">
            {data.interview.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-indigo-400" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data?.sources && data.sources.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{d.insights.sourcesLabel}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {data.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-indigo-600 underline-offset-2 hover:underline" style={{ maxWidth: "100%" }}>
                {s.title} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400">{d.insights.disclaimer}</p>
    </div>
  );
}
