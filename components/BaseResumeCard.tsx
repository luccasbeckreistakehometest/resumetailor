"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { factsCount, factsText, type ProfileFacts } from "@/lib/profile/facts";

type Profile = { resume: string; facts: ProfileFacts; roles: string[]; updatedAt: string };

/** "Meu currículo base": the saved résumé, editable, with what the kit may also use, and a delete. */
export function BaseResumeCard() {
  const { r, lang } = useI18n();
  const P = r.profile;
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/profile", { cache: "no-store" }).then((res) => res.json()).then((j) => {
      if (!alive) return;
      setProfile(j.profile ?? null); setDraft(j.profile?.resume ?? "");
    }).catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, []);

  if (profile === undefined) return null;
  const date = profile ? new Date(profile.updatedAt).toLocaleDateString(lang === "pt" ? "pt-BR" : lang) : "";
  const n = profile ? factsCount(profile.facts) : 0;

  async function save() {
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: draft }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setProfile(j.profile); setNote(P.saved); }
  }
  async function remove() {
    if (!window.confirm(P.confirmRemove)) return;
    await fetch("/api/profile", { method: "DELETE" });
    setProfile(null); setDraft(""); setNote(P.removed);
  }

  return (
    <section className="card mt-8 p-5" data-testid="base-resume">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl text-ink">📄 {P.baseTitle}</p>
        {profile && <p className="text-xs text-muted">{P.updated(date)}</p>}
      </div>
      <p className="mt-1 text-sm text-ink-2">{profile ? P.baseIntro : P.baseEmpty}</p>
      {profile && (
        <>
          <label htmlFor="rt-base-resume" className="sr-only">{P.baseTitle}</label>
          <textarea id="rt-base-resume" className="field mt-4 font-mono text-[13px]" rows={8} value={draft} onChange={(e) => { setDraft(e.target.value); setNote(""); }} data-testid="base-resume-text" />
          {n > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-ink" data-testid="base-resume-facts">🎙 {P.factsTitle(n)}</summary>
              <p className="mt-2 whitespace-pre-line text-ink-2">{factsText(profile.facts)}</p>
            </details>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={draft === profile.resume || draft.trim().length < 30} className="btn btn-ink !py-1.5 !text-sm" data-testid="base-resume-save">{P.save}</button>
            <Link href="/start?new=tailor&base=profile" className="btn btn-primary !py-1.5 !text-sm" data-testid="base-resume-new">{P.newJob}</Link>
            <button type="button" onClick={remove} className="text-sm text-muted hover:text-oxblood" data-testid="base-resume-delete">{P.remove}</button>
          </div>
        </>
      )}
      {note && <p className="mt-2 text-sm text-moss" role="status">{note}</p>}
    </section>
  );
}
