"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { Container, Eyebrow } from "@/components/ui";
import { STAGES, nextSteps, todayIso, type Funnel, type Stage } from "@/lib/applications/logic";
import type { ApplicationView } from "@/lib/server/applications";
import type { GenerationView } from "@/lib/server/generations";
import { RadarStrip, type RadarItem } from "@/components/RadarStrip";

type Draft = {
  company: string; role: string; link: string; stage: Stage; generationId: string; notes: string; nextStepAt: string;
  appliedAt: string; interviewAtTime: string; contactName: string; contactChannel: string; contactValue: string; offerType: string; offerAmount: string;
};
type Patch = Record<string, unknown>;
const blank = (): Draft => ({ company: "", role: "", link: "", stage: "saved", generationId: "", notes: "", nextStepAt: "", appliedAt: "", interviewAtTime: "", contactName: "", contactChannel: "", contactValue: "", offerType: "", offerAmount: "" });
/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
const toLocalInput = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const send = (url: string, method: string, body?: unknown) => fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

/**
 * The application tracker: a five-column board, a quick-add row, and the funnel that says whether
 * the search is working. No AI here — this is the one place the user does the bookkeeping, and
 * the numbers must be theirs.
 */
function ApplicationsInner() {
  const { x, r, lang, to } = useI18n();
  const R = r.tracker;
  const { user } = useAuth();
  const params = useSearchParams();
  const A = x.applications;
  const [items, setItems] = useState<ApplicationView[] | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [alerts, setAlerts] = useState<RadarItem[]>([]);
  const [kits, setKits] = useState<GenerationView[]>([]);
  const [draft, setDraft] = useState<Draft>(blank());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(blank());
  // "now" is fixed for the render pass; the compiler treats Date.now() during render as impure.
  const [now] = useState(() => Date.now());
  const today = todayIso(new Date(now));

  const load = useCallback(() => fetch("/api/applications", { cache: "no-store" }).then((r) => r.json()).then((j) => { setItems(j.items ?? []); setFunnel(j.funnel ?? null); setAlerts(j.radar ?? []); }), []);
  useEffect(() => { void load(); fetch("/api/generations", { cache: "no-store" }).then((r) => r.json()).then((j) => setKits(j.items ?? [])).catch(() => {}); }, [load, user?.id]);

  // Arriving from a kit result: the add row opens with that kit and role already filled.
  useEffect(() => {
    if (params.get("add") !== "1") return;
    const id = setTimeout(() => { setAdding(true); setDraft((d) => ({ ...d, generationId: params.get("gen") ?? "", role: params.get("role") ?? d.role })); }, 0);
    return () => clearTimeout(id);
  }, [params]);

  async function add() {
    if (!draft.company.trim() && !draft.role.trim()) return setError(A.needName);
    setError("");
    const r = await send("/api/applications", "POST", { company: draft.company, role: draft.role, link: draft.link, stage: draft.stage, notes: draft.notes, generationId: draft.generationId || null, nextStepAt: draft.nextStepAt || null });
    if (!r.ok) return setError(x.errors.generic);
    setDraft(blank()); setAdding(false); await load();
  }
  async function patch(id: string, body: Patch) {
    const r = await send(`/api/applications/${id}`, "PATCH", body);
    if (!r.ok) return setError(x.errors.generic);
    await load();
  }
  async function remove(id: string) { await send(`/api/applications/${id}`, "DELETE"); setEditId(null); await load(); }
  const move = (a: ApplicationView, dir: 1 | -1) => { const i = STAGES.indexOf(a.stage) + dir; if (i >= 0 && i < STAGES.length) void patch(a.id, { stage: STAGES[i] }); };
  const startEdit = (a: ApplicationView) => {
    setEditId(a.id);
    setEdit({
      company: a.company, role: a.role, link: a.link, stage: a.stage, generationId: a.generationId ?? "", notes: a.notes, nextStepAt: a.nextStepAt ?? "",
      appliedAt: a.appliedAt ?? "", interviewAtTime: toLocalInput(a.interviewAtTime), contactName: a.contactName, contactChannel: a.contactChannel, contactValue: a.contactValue,
      offerType: a.offerType ?? "", offerAmount: a.offerAmount === null ? "" : String(a.offerAmount),
    });
  };
  async function saveEdit() {
    if (!editId) return;
    const amount = Number(edit.offerAmount.replace(/\./g, "").replace(",", "."));
    await patch(editId, {
      company: edit.company, role: edit.role, link: edit.link, notes: edit.notes, generationId: edit.generationId || null, nextStepAt: edit.nextStepAt || null,
      appliedAt: edit.appliedAt || null, interviewAtTime: edit.interviewAtTime ? new Date(edit.interviewAtTime).toISOString() : null,
      contactName: edit.contactName, contactChannel: edit.contactChannel, contactValue: edit.contactValue,
      offerType: edit.offerType || null, offerAmount: edit.offerAmount.trim() && Number.isFinite(amount) ? amount : null,
    });
    setEditId(null);
  }
  const when = (iso: string) => new Date(iso).toLocaleString(lang === "pt" ? "pt-BR" : lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-BR" : lang, { day: "numeric", month: "short" });
  const daysIn = (iso: string) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
  const upcoming = items ? nextSteps(items, today) : [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{A.eyebrow}</Eyebrow>
            <h1 className="font-display mt-2 text-4xl text-ink">{A.title}</h1>
            <p className="mt-2 max-w-2xl text-ink-2">{A.subtitle}</p>
            {!user && <p className="mt-2 text-xs text-muted">{A.anonNote}</p>}
          </div>
          <button onClick={() => setAdding(!adding)} className="btn btn-primary" data-testid="app-open-add">+ {A.add}</button>
        </div>

        {items && items.length > 0 && <RadarStrip alerts={alerts} items={items} onSent={() => void load()} />}

        {funnel && (
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="funnel">
            {([["total", funnel.total], ["applied", funnel.applied], ["interviews", funnel.interviews], ["rate", funnel.interviewRate === null ? "—" : `${funnel.interviewRate}%`], ["offers", funnel.offers], ["rejected", funnel.rejected]] as const).map(([k, v]) => (
              <div key={k} className={"card p-4 " + (k === "rate" ? "border-2 !border-ink" : "")} data-testid={`funnel-${k}`}>
                <p className="eyebrow">{A.funnel[k]}</p>
                <p className="font-display mt-1 text-3xl text-ink">{v}</p>
              </div>
            ))}
            <p className="text-xs text-muted sm:col-span-3 lg:col-span-6">{A.rateHint}</p>
          </div>
        )}

        {adding && (
          <div className="card mt-6 p-5" data-testid="app-add-form">
            <p className="eyebrow">{A.addTitle}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <input className="field" placeholder={A.company} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} data-testid="app-company" autoFocus />
              <input className="field" placeholder={A.role} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} data-testid="app-role" />
              <input className="field" placeholder={A.link} value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} data-testid="app-link" />
              <select className="field" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage })} data-testid="app-stage" aria-label={A.stage}>
                {STAGES.map((s) => <option key={s} value={s}>{A.stages[s]}</option>)}
              </select>
              <select className="field" value={draft.generationId} onChange={(e) => setDraft({ ...draft, generationId: e.target.value })} data-testid="app-kit" aria-label={A.kit}>
                <option value="">{A.noKit}</option>
                {kits.map((k) => <option key={k.id} value={k.id}>{k.title}{k.targetRole ? ` · ${k.targetRole}` : ""}</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={add} className="btn btn-ink !py-2 !text-sm" data-testid="app-add">{A.add}</button>
              <button onClick={() => { setAdding(false); setError(""); }} className="text-sm text-muted hover:text-ink">{A.cancel}</button>
              {error && <p className="text-sm text-oxblood" role="alert" data-testid="app-error">{error}</p>}
            </div>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm" data-testid="next-steps">
            <span className="eyebrow mr-1">{A.upcoming}</span>
            {upcoming.length === 0 && <span className="text-muted">{A.noUpcoming}</span>}
            {upcoming.slice(0, 6).map(({ item, overdue }) => (
              <span key={item.id} className={"rounded-full px-3 py-1 text-xs font-medium ring-1 " + (overdue ? "bg-oxblood/10 text-oxblood ring-oxblood/30" : "bg-surface text-ink-2 ring-edge")}>
                {fmt(item.nextStepAt!)} · {item.company || item.role}{overdue ? ` · ${A.overdue}` : ""}
              </span>
            ))}
          </div>
        )}

        {items && items.length === 0 && !adding && (
          <div className="card mt-8 p-10 text-center"><p className="text-ink-2">{A.empty}</p><button onClick={() => setAdding(true)} className="btn btn-primary mt-6">+ {A.add}</button></div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5" data-tour="applications" data-testid="board">
          {STAGES.map((stage) => {
            const col = (items ?? []).filter((a) => a.stage === stage);
            return (
              <section key={stage} className="rounded-2xl border border-edge bg-paper-2/60 p-3" data-testid={`col-${stage}`}>
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-ink">{A.stages[stage]}</p>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted ring-1 ring-edge" data-testid={`count-${stage}`}>{col.length}</span>
                </div>
                <ul className="mt-3 space-y-3">
                  {col.map((a) => (
                    <li key={a.id} className="card p-3.5" data-testid="app-card">
                      {editId === a.id ? (
                        <div className="space-y-2" data-testid="app-edit">
                          <input className="field !py-1.5 !text-sm" placeholder={A.company} value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
                          <input className="field !py-1.5 !text-sm" placeholder={A.role} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} />
                          <input className="field !py-1.5 !text-sm" placeholder={A.link} value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} />
                          <label className="block text-xs text-muted">{A.nextStep}<input type="date" className="field mt-1 !py-1.5 !text-sm" value={edit.nextStepAt} onChange={(e) => setEdit({ ...edit, nextStepAt: e.target.value })} data-testid="edit-next" /></label>
                          <select className="field !py-1.5 !text-sm" value={edit.generationId} onChange={(e) => setEdit({ ...edit, generationId: e.target.value })} aria-label={A.kit}>
                            <option value="">{A.noKit}</option>
                            {kits.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
                          </select>
                          {edit.stage !== "saved" && <label className="block text-xs text-muted">{R.fields.appliedAt}<input type="date" className="field mt-1 !py-1.5 !text-sm" value={edit.appliedAt} max={today} onChange={(e) => setEdit({ ...edit, appliedAt: e.target.value })} data-testid="edit-applied" /></label>}
                          <label className="block text-xs text-muted">{R.fields.interviewAt}<input type="datetime-local" className="field mt-1 !py-1.5 !text-sm" value={edit.interviewAtTime} onChange={(e) => setEdit({ ...edit, interviewAtTime: e.target.value })} data-testid="edit-interview" /></label>
                          <input className="field !py-1.5 !text-sm" placeholder={R.fields.contactName} value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} data-testid="edit-contact-name" />
                          <div className="grid grid-cols-[6rem_1fr] gap-1.5">
                            <select className="field !py-1.5 !text-sm" value={edit.contactChannel} onChange={(e) => setEdit({ ...edit, contactChannel: e.target.value })} aria-label={R.fields.channel}>
                              {Object.entries(R.fields.channels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <input className="field !py-1.5 !text-sm" placeholder={R.fields.contactValue} value={edit.contactValue} onChange={(e) => setEdit({ ...edit, contactValue: e.target.value })} />
                          </div>
                          {edit.stage === "offer" && (
                            <div className="grid grid-cols-[5rem_1fr] gap-1.5">
                              <select className="field !py-1.5 !text-sm" value={edit.offerType} onChange={(e) => setEdit({ ...edit, offerType: e.target.value })} aria-label={R.fields.offerType} data-testid="edit-offer-type">
                                <option value="">—</option><option value="clt">{R.fields.clt}</option><option value="pj">{R.fields.pj}</option>
                              </select>
                              <input inputMode="decimal" className="field !py-1.5 !text-sm" placeholder={R.fields.offerAmount} value={edit.offerAmount} onChange={(e) => setEdit({ ...edit, offerAmount: e.target.value })} data-testid="edit-offer-amount" />
                            </div>
                          )}
                          <textarea className="field !py-1.5 !text-sm" rows={3} placeholder={A.notes} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} data-testid="edit-notes" />
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={saveEdit} className="btn btn-ink !py-1.5 !text-xs" data-testid="edit-save">{A.save}</button>
                            <button onClick={() => setEditId(null)} className="text-xs text-muted hover:text-ink">{A.cancel}</button>
                            <button onClick={() => remove(a.id)} className="ml-auto text-xs text-muted hover:text-oxblood" data-testid="app-delete">{A.delete}</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="truncate font-semibold text-ink">{a.company || a.role}</p>
                          {a.company && a.role && <p className="truncate text-sm text-ink-2">{a.role}</p>}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            {a.kitTitle && <span className="rounded-full bg-gold-2 px-2 py-0.5 font-medium text-ink" data-testid="app-kit-chip">📄 {a.kitTitle}</span>}
                            {a.nextStepAt && <span className={"rounded-full px-2 py-0.5 font-medium ring-1 " + (a.nextStepAt < today && a.stage !== "rejected" ? "bg-oxblood/10 text-oxblood ring-oxblood/30" : "bg-surface text-ink-2 ring-edge")} data-testid="app-next">📅 {fmt(a.nextStepAt)}</span>}
                            <span className="rounded-full bg-surface px-2 py-0.5 text-muted ring-1 ring-edge">{A.daysIn(daysIn(a.stageChangedAt))}</span>
                            {a.interviewAtTime && <span className="rounded-full bg-moss-2 px-2 py-0.5 font-medium text-ink" data-testid="app-interview">{R.interviewChip(when(a.interviewAtTime))}</span>}
                          </div>
                          {a.notes && <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-ink-2" data-testid="app-notes">{a.notes}</p>}
                          <div className="mt-3 flex items-center gap-1 border-t border-edge pt-2.5">
                            <button onClick={() => move(a, -1)} disabled={a.stage === "saved"} className="rounded-md px-2 py-1 text-sm text-ink-2 hover:bg-paper disabled:opacity-30" aria-label={A.movePrev} title={A.movePrev} data-testid="move-prev">←</button>
                            <select className="min-w-0 flex-1 rounded-md border border-edge bg-surface px-1.5 py-1 text-xs text-ink-2" value={a.stage} onChange={(e) => void patch(a.id, { stage: e.target.value as Stage })} aria-label={A.stage} data-testid="card-stage">
                              {STAGES.map((s) => <option key={s} value={s}>{A.stages[s]}</option>)}
                            </select>
                            <button onClick={() => move(a, 1)} disabled={a.stage === "rejected"} className="rounded-md px-2 py-1 text-sm text-ink-2 hover:bg-paper disabled:opacity-30" aria-label={A.moveNext} title={A.moveNext} data-testid="move-next">→</button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-oxblood underline-offset-2 hover:underline">{A.open} ↗</a>}
                            {a.generationId && <Link href={`/start?gen=${a.generationId}`} className="text-muted hover:text-ink">{x.library.open}</Link>}
                            {(a.stage === "interview" || a.interviewAtTime) && <Link href={`/brief/${a.id}`} className="text-oxblood" data-testid="app-brief">{R.brief}</Link>}
                            {a.interviewAtTime && <a href={`/api/applications/${a.id}/ics?kind=interview&lang=${lang}`} className="text-oxblood" data-testid="app-ics">📅</a>}
                            {a.stage === "offer" && lang === "pt" && <Link href={`${to("calculator")}?${a.offerType === "pj" ? "pj" : "clt"}=${a.offerAmount ?? ""}`} className="text-oxblood" data-testid="app-compare">{R.compare}</Link>}
                            <button onClick={() => startEdit(a)} className="ml-auto text-muted hover:text-ink" data-testid="app-edit-btn">{A.edit}</button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

export default function ApplicationsPage() {
  return <Suspense fallback={null}><ApplicationsInner /></Suspense>;
}
