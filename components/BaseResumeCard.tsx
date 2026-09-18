"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { factsCount, factsText, type ProfileFacts } from "@/lib/profile/facts";
import { Button, Icon, Textarea } from "@/components/ui";

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
    <section className="border border-[var(--rule)] p-[var(--s-6)]" data-testid="base-resume">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--s-3)]">
        <p className="doc-21 text-[color:var(--ink)]">{P.baseTitle}</p>
        {profile && <p className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">{P.updated(date)}</p>}
      </div>
      <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{profile ? P.baseIntro : P.baseEmpty}</p>
      {profile && (
        <>
          <label htmlFor="rt-base-resume" className="sr-only">{P.baseTitle}</label>
          <Textarea id="rt-base-resume" className="mt-[var(--s-5)]" rows={8} value={draft} onChange={(e) => { setDraft(e.target.value); setNote(""); }} data-testid="base-resume-text" />
          {n > 0 && (
            <details className="mt-[var(--s-4)] font-sans text-[length:var(--ui-13)]">
              <summary className="flex cursor-pointer items-center gap-[var(--s-2)] font-medium text-[color:var(--ink)]" data-testid="base-resume-facts">
                <Icon name="mic" size={16} />{P.factsTitle(n)}
              </summary>
              <p className="mt-[var(--s-3)] whitespace-pre-line text-[color:var(--ink-2)]">{factsText(profile.facts)}</p>
            </details>
          )}
          <div className="mt-[var(--s-5)] flex flex-wrap items-center gap-[var(--s-3)]">
            <Button size="sm" onClick={save} disabled={draft === profile.resume || draft.trim().length < 30} data-testid="base-resume-save">{P.save}</Button>
            <Button size="sm" variant="outline" href="/start?new=tailor&base=profile" data-testid="base-resume-new">{P.newJob}</Button>
            <Button size="sm" variant="quiet" onClick={remove} data-testid="base-resume-delete">{P.remove}</Button>
          </div>
        </>
      )}
      {note && <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-13)] text-[color:var(--kept)]" role="status">{note}</p>}
    </section>
  );
}
