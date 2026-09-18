"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/components/AuthProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { Button, Container, EmptyState, Icon, Input, Select, Table, Tabs, Textarea } from "@/components/ui";
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
  // Density is a decision per view: the board is comfortable, the table is a tool.
  const [view, setView] = useState<"board" | "table">("board");
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Container className="py-[var(--s-9)]">
        <div className="flex flex-wrap items-end justify-between gap-[var(--s-5)] border-b border-[var(--rule)] pb-[var(--s-5)]">
          <div>
            <p className="eyebrow">{A.eyebrow}</p>
            <h1 className="doc-45 mt-[var(--s-3)] text-[color:var(--ink)]">{A.title}</h1>
            <p className="mt-[var(--s-4)] max-w-[var(--measure)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[color:var(--ink-2)]">{A.subtitle}</p>
            {!user && <p className="mt-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{A.anonNote}</p>}
          </div>
          <Button onClick={() => setAdding(!adding)} icon="plus" data-testid="app-open-add">{A.add}</Button>
        </div>

        {items && items.length > 0 && <RadarStrip alerts={alerts} items={items} onSent={() => void load()} />}

        {/* Six equal stat cards became one line of figures: the rate is the only one that is a
            judgement, so it is the only one set at the larger size. */}
        {funnel && (
          <section className="mt-[var(--s-7)] border-b border-[var(--rule)] pb-[var(--s-5)]" data-testid="funnel">
            <dl className="flex flex-wrap items-baseline gap-x-[var(--s-9)] gap-y-[var(--s-4)]">
              {([["total", funnel.total], ["applied", funnel.applied], ["interviews", funnel.interviews], ["rate", funnel.interviewRate === null ? "—" : `${funnel.interviewRate}%`], ["offers", funnel.offers], ["rejected", funnel.rejected]] as const).map(([k, v]) => (
                <div key={k} data-testid={`funnel-${k}`}>
                  <dt className="eyebrow">{A.funnel[k]}</dt>
                  <dd className={"mt-[var(--s-2)] font-mono tabular-nums text-[color:var(--ink)] " + (k === "rate" ? "text-[length:var(--mn-24)] font-medium" : "text-[length:var(--mn-15)]")}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-[var(--s-4)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{A.rateHint}</p>
          </section>
        )}

        {adding && (
          <div className="mt-[var(--s-7)] border border-[var(--rule)] p-[var(--s-6)]" data-testid="app-add-form">
            <p className="eyebrow">{A.addTitle}</p>
            <div className="mt-[var(--s-4)] grid gap-[var(--s-4)] md:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <Input placeholder={A.company} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} data-testid="app-company" aria-label={A.company} autoFocus />
              <Input placeholder={A.role} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} data-testid="app-role" aria-label={A.role} />
              <Input placeholder={A.link} value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} data-testid="app-link" aria-label={A.link} />
              <Select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as Stage })} data-testid="app-stage" aria-label={A.stage}>
                {STAGES.map((s) => <option key={s} value={s}>{A.stages[s]}</option>)}
              </Select>
              <Select value={draft.generationId} onChange={(e) => setDraft({ ...draft, generationId: e.target.value })} data-testid="app-kit" aria-label={A.kit}>
                <option value="">{A.noKit}</option>
                {kits.map((k) => <option key={k.id} value={k.id}>{k.title}{k.targetRole ? ` · ${k.targetRole}` : ""}</option>)}
              </Select>
            </div>
            <div className="mt-[var(--s-4)] flex flex-wrap items-center gap-[var(--s-4)]">
              <Button size="sm" onClick={add} data-testid="app-add">{A.add}</Button>
              <Button size="sm" variant="quiet" onClick={() => { setAdding(false); setError(""); }}>{A.cancel}</Button>
              {error && <p className="font-sans text-[length:var(--ui-13)] text-[color:var(--mark)]" role="alert" data-testid="app-error">{error}</p>}
            </div>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="mt-[var(--s-6)] flex flex-wrap items-center gap-[var(--s-3)]" data-testid="next-steps">
            <span className="eyebrow">{A.upcoming}</span>
            {upcoming.length === 0 && <span className="font-sans text-[length:var(--ui-13)] text-[color:var(--ink-muted)]">{A.noUpcoming}</span>}
            {upcoming.slice(0, 6).map(({ item, overdue }) => (
              <span
                key={item.id}
                className="inline-flex h-6 items-center rounded-[var(--r-1)] border px-[var(--s-3)] font-mono text-[length:var(--mn-13)] tabular-nums"
                style={overdue
                  ? { borderColor: "var(--mark)", color: "var(--mark)", background: "var(--mark-wash)" }
                  : { borderColor: "var(--rule)", color: "var(--ink-2)", background: "var(--sunken)" }}
              >
                {fmt(item.nextStepAt!)} · {item.company || item.role}{overdue ? ` · ${A.overdue}` : ""}
              </span>
            ))}
          </div>
        )}

        {items && items.length === 0 && !adding && (
          <EmptyState title={A.empty} action={<Button icon="plus" onClick={() => setAdding(true)}>{A.add}</Button>} />
        )}

        {items && items.length > 0 && (
          <Tabs
            className="mt-[var(--s-8)]"
            tabs={[{ id: "board", label: A.views.board }, { id: "table", label: A.views.table }]}
            value={view}
            onChange={(v) => setView(v as "board" | "table")}
          />
        )}

        {view === "table" && items && items.length > 0 && (
          <section className="mt-[var(--s-6)]" data-density="compact" data-testid="app-table">
            <Table
              rows={items}
              getKey={(a) => a.id}
              empty={A.empty}
              minWidth="760px"
              rowAttrs={(a) => ({ "data-testid": "app-row", "data-stage": a.stage })}
              columns={[
                {
                  key: "company", header: A.company, width: "28%", cell: (a) => (
                    <span className="block">
                      <span className="block truncate font-medium text-[color:var(--ink)]">{a.company || a.role}</span>
                      {a.company && a.role && <span className="mt-[2px] block truncate font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{a.role}</span>}
                    </span>
                  ),
                },
                {
                  key: "stage", header: A.stage, width: "16%", raw: true, cell: (a) => (
                    <Select className="h-8" value={a.stage} onChange={(e) => void patch(a.id, { stage: e.target.value as Stage })} aria-label={A.stage} data-testid="row-stage">
                      {STAGES.map((s) => <option key={s} value={s}>{A.stages[s]}</option>)}
                    </Select>
                  ),
                },
                { key: "next", header: A.nextStep, width: "16%", mono: true, cell: (a) => a.nextStepAt ? fmt(a.nextStepAt) : "—" },
                { key: "days", header: A.upcoming, width: "14%", align: "right", mono: true, cell: (a) => String(daysIn(a.stageChangedAt)) },
                { key: "kit", header: A.kit, width: "18%", cell: (a) => a.kitTitle ?? A.noKit },
                {
                  key: "edit", header: "", width: "8%", align: "right", raw: true, cell: (a) => (
                    <Button size="sm" variant="quiet" onClick={() => { setView("board"); startEdit(a); }} data-testid="row-edit">{A.edit}</Button>
                  ),
                },
              ]}
            />
          </section>
        )}

        <div className={"mt-[var(--s-6)] grid gap-[var(--s-5)] md:grid-cols-2 lg:grid-cols-5 lg:gap-x-[var(--gutter)] " + (view === "table" ? "hidden" : "")} data-tour="applications" data-testid="board">
          {STAGES.map((stage) => {
            const col = (items ?? []).filter((a) => a.stage === stage);
            return (
              <section key={stage} data-testid={`col-${stage}`} data-density="compact">
                <div className="flex items-baseline justify-between gap-[var(--s-3)] border-b-2 border-[var(--ink)] pb-[var(--s-2)]">
                  <p className="eyebrow">{A.stages[stage]}</p>
                  <span className="font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]" data-testid={`count-${stage}`}>{col.length}</span>
                </div>
                <ul className="mt-[var(--s-4)] flex flex-col gap-[var(--s-4)]">
                  {col.map((a) => (
                    <li key={a.id} className="border border-[var(--rule)] p-[var(--s-4)]" data-testid="app-card">
                      {editId === a.id ? (
                        <div className="flex flex-col gap-[var(--s-3)]" data-testid="app-edit">
                          <Input placeholder={A.company} aria-label={A.company} value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
                          <Input placeholder={A.role} aria-label={A.role} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} />
                          <Input placeholder={A.link} aria-label={A.link} value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} />
                          <label className="block font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{A.nextStep}
                            <Input type="date" className="mt-[var(--s-2)]" value={edit.nextStepAt} onChange={(e) => setEdit({ ...edit, nextStepAt: e.target.value })} data-testid="edit-next" />
                          </label>
                          <Select value={edit.generationId} onChange={(e) => setEdit({ ...edit, generationId: e.target.value })} aria-label={A.kit}>
                            <option value="">{A.noKit}</option>
                            {kits.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
                          </Select>
                          {edit.stage !== "saved" && (
                            <label className="block font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{R.fields.appliedAt}
                              <Input type="date" className="mt-[var(--s-2)]" value={edit.appliedAt} max={today} onChange={(e) => setEdit({ ...edit, appliedAt: e.target.value })} data-testid="edit-applied" />
                            </label>
                          )}
                          <label className="block font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">{R.fields.interviewAt}
                            <Input type="datetime-local" className="mt-[var(--s-2)]" value={edit.interviewAtTime} onChange={(e) => setEdit({ ...edit, interviewAtTime: e.target.value })} data-testid="edit-interview" />
                          </label>
                          <Input placeholder={R.fields.contactName} aria-label={R.fields.contactName} value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} data-testid="edit-contact-name" />
                          <div className="grid grid-cols-[6.5rem_1fr] gap-[var(--s-2)]">
                            <Select value={edit.contactChannel} onChange={(e) => setEdit({ ...edit, contactChannel: e.target.value })} aria-label={R.fields.channel}>
                              {Object.entries(R.fields.channels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </Select>
                            <Input placeholder={R.fields.contactValue} aria-label={R.fields.contactValue} value={edit.contactValue} onChange={(e) => setEdit({ ...edit, contactValue: e.target.value })} />
                          </div>
                          {edit.stage === "offer" && (
                            <div className="grid grid-cols-[5.5rem_1fr] gap-[var(--s-2)]">
                              <Select value={edit.offerType} onChange={(e) => setEdit({ ...edit, offerType: e.target.value })} aria-label={R.fields.offerType} data-testid="edit-offer-type">
                                <option value="">—</option><option value="clt">{R.fields.clt}</option><option value="pj">{R.fields.pj}</option>
                              </Select>
                              <Input inputMode="decimal" placeholder={R.fields.offerAmount} aria-label={R.fields.offerAmount} value={edit.offerAmount} onChange={(e) => setEdit({ ...edit, offerAmount: e.target.value })} data-testid="edit-offer-amount" />
                            </div>
                          )}
                          <Textarea rows={3} placeholder={A.notes} aria-label={A.notes} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} data-testid="edit-notes" />
                          <div className="flex flex-wrap items-center gap-[var(--s-3)]">
                            <Button size="sm" onClick={saveEdit} data-testid="edit-save">{A.save}</Button>
                            <Button size="sm" variant="quiet" onClick={() => setEditId(null)}>{A.cancel}</Button>
                            <Button size="sm" variant="quiet" className="ml-auto text-[color:var(--mark)]" onClick={() => remove(a.id)} data-testid="app-delete">{A.delete}</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="truncate font-sans text-[length:var(--ui-15)] font-semibold text-[color:var(--ink)]">{a.company || a.role}</p>
                          {a.company && a.role && <p className="truncate font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]">{a.role}</p>}
                          <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-x-[var(--s-4)] gap-y-[var(--s-2)] font-mono text-[length:var(--mn-13)] tabular-nums text-[color:var(--ink-muted)]">
                            {a.kitTitle && <span className="truncate" data-testid="app-kit-chip">{a.kitTitle}</span>}
                            {a.nextStepAt && (
                              <span data-testid="app-next" style={{ color: a.nextStepAt < today && a.stage !== "rejected" ? "var(--mark)" : undefined }}>{fmt(a.nextStepAt)}</span>
                            )}
                            <span>{A.daysIn(daysIn(a.stageChangedAt))}</span>
                            {a.interviewAtTime && <span data-testid="app-interview" className="text-[color:var(--kept)]">{R.interviewChip(when(a.interviewAtTime))}</span>}
                          </div>
                          {a.notes && <p className="mt-[var(--s-3)] line-clamp-3 whitespace-pre-line font-sans text-[length:var(--ui-12)] leading-[var(--ui-12-lh)] text-[color:var(--ink-2)]" data-testid="app-notes">{a.notes}</p>}
                          <div className="mt-[var(--s-4)] flex items-center gap-[var(--s-2)] border-t border-[var(--rule-hairline)] pt-[var(--s-3)]">
                            <Button size="sm" variant="quiet" icon="arrow-left" label={A.movePrev} onClick={() => move(a, -1)} disabled={a.stage === "saved"} data-testid="move-prev" />
                            <Select className="h-8 min-w-0 flex-1" value={a.stage} onChange={(e) => void patch(a.id, { stage: e.target.value as Stage })} aria-label={A.stage} data-testid="card-stage">
                              {STAGES.map((s) => <option key={s} value={s}>{A.stages[s]}</option>)}
                            </Select>
                            <Button size="sm" variant="quiet" icon="arrow-right" label={A.moveNext} onClick={() => move(a, 1)} disabled={a.stage === "rejected"} data-testid="move-next" />
                          </div>
                          <div className="mt-[var(--s-3)] flex flex-wrap items-center gap-[var(--s-4)] font-sans text-[length:var(--ui-12)]">
                            {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{A.open}</a>}
                            {a.generationId && <Link href={`/start?gen=${a.generationId}`} className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]">{x.library.open}</Link>}
                            {(a.stage === "interview" || a.interviewAtTime) && <Link href={`/brief/${a.id}`} className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid="app-brief">{R.brief}</Link>}
                            {a.interviewAtTime && <a href={`/api/applications/${a.id}/ics?kind=interview&lang=${lang}`} className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]" data-testid="app-ics" aria-label={R.fields.interviewAt}><Icon name="download" size={16} /></a>}
                            {a.stage === "offer" && lang === "pt" && <Link href={`${to("calculator")}?${a.offerType === "pj" ? "pj" : "clt"}=${a.offerAmount ?? ""}`} className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]" data-testid="app-compare">{R.compare}</Link>}
                            <button onClick={() => startEdit(a)} className="ml-auto text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]" data-testid="app-edit-btn">{A.edit}</button>
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
      <SiteFooter />
    </div>
  );
}

export default function ApplicationsPage() {
  return <Suspense fallback={null}><ApplicationsInner /></Suspense>;
}
