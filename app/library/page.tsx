"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLibrary, removeFromLibrary, renameInLibrary, setActiveResult, markPaid, LibraryItem } from "@/lib/library";

export default function LibraryPage() {
  const { d } = useI18n();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setItems(getLibrary());
    setReady(true);
  }, []);

  function open(item: LibraryItem) {
    markPaid();
    setActiveResult(item);
    window.open("/print", "_blank");
  }

  function remove(id: string) {
    removeFromLibrary(id);
    setItems(getLibrary());
  }

  function doRename(id: string) {
    if (draft.trim()) renameInLibrary(id, draft.trim());
    setEditId(null);
    setItems(getLibrary());
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">RT</div>
            <span className="text-base font-semibold tracking-tight text-slate-900">ResumeTailor</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{d.library.title}</h1>
        <p className="mt-1 text-slate-600">{d.library.subtitle}</p>

        {ready && items.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-500">{d.library.empty}</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              {d.library.emptyCta}
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                {editId === item.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") doRename(item.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    className="w-full rounded-lg border border-indigo-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">{item.title}</span>
                    {item.matchAfter > 0 && (
                      <span className="flex-none rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {item.matchAfter}% {d.library.matchLabel}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </div>
              </div>
              <div className="flex flex-none flex-wrap items-center gap-2">
                {editId === item.id ? (
                  <>
                    <button onClick={() => doRename(item.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{d.library.save}</button>
                    <button onClick={() => setEditId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">{d.library.cancel}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => open(item)} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{d.library.view}</button>
                    <button onClick={() => { setEditId(item.id); setDraft(item.title); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">{d.library.rename}</button>
                    <button onClick={() => remove(item.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">{d.library.delete}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            {d.library.backHome}
          </Link>
        </p>
      </main>
    </div>
  );
}
