"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Badge, Breadcrumb, Button, Checkbox, Chip, Container, Dialog, DocumentLayout, Drawer, EmptyState,
  Editorial, Field, Icon, ICON_NAMES, Input, Meter, Notice, Pagination, Panel, Radio, Rule, Seal,
  Select, Sheet, Skeleton, SkeletonRows, Stepper, Table, Tabs, Textarea, Toast, Token, Tooltip, Well,
} from "@/components/ui";

const SECTIONS = [
  ["type", "Type"], ["colour", "Colour"], ["space", "Space & radius"], ["icons", "Icons"],
  ["buttons", "Buttons"], ["fields", "Fields"], ["chips", "Chips, tokens, badges"],
  ["meter", "Meter"], ["tables", "Tables"], ["surfaces", "Surfaces"], ["states", "States"],
  ["nav", "Navigation"], ["overlays", "Overlays"], ["layouts", "Layouts"],
] as const;

export function DesignView() {
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("data-theme");
    root.setAttribute("data-theme", dark ? "dark" : "light");
    return () => { if (before) root.setAttribute("data-theme", before); };
  }, [dark]);

  return (
    <div data-density={compact ? "compact" : undefined} className="min-h-screen bg-[var(--page)] pb-[var(--s-13)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--page)]/95 backdrop-blur-[2px]">
        <Container className="flex flex-wrap items-center justify-between gap-[var(--s-4)] py-[var(--s-4)]">
          <div className="flex items-baseline gap-[var(--s-5)]">
            <span className="doc-21 font-semibold text-[var(--ink)]">Ofício do documento</span>
            <span className="ui-13 text-[var(--ink-muted)]">the system, rendered</span>
          </div>
          <div className="flex items-center gap-[var(--s-3)]">
            <Button size="sm" variant={compact ? "primary" : "outline"} onClick={() => setCompact((v) => !v)}>
              {compact ? "Compact" : "Comfortable"}
            </Button>
            <Button size="sm" variant="outline" icon={dark ? "eye" : "lock"} onClick={() => setDark((v) => !v)}>
              {dark ? "Desk lamp" : "Paper"}
            </Button>
          </div>
        </Container>
      </header>

      <Container className="flex flex-col gap-[var(--s-9)] lg:flex-row lg:gap-[var(--gutter)]">
        <nav aria-label="Sections" className="shrink-0 pt-[var(--s-8)] lg:sticky lg:top-[72px] lg:h-fit lg:w-[180px]">
          <ol className="flex flex-wrap gap-x-[var(--s-5)] gap-y-[var(--s-2)] lg:block">
            {SECTIONS.map(([id, label]) => (
              <li key={id} className="lg:border-b lg:border-[var(--rule-hairline)]">
                <a href={`#${id}`} className="ui-13 block py-[var(--s-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0 flex-1">
          <TypeSection />
          <ColourSection />
          <SpaceSection />
          <IconSection />
          <ButtonSection />
          <FieldSection />
          <ChipSection />
          <MeterSection />
          <TableSection />
          <SurfaceSection />
          <StateSection />
          <NavSection />
          <OverlaySection />
          <LayoutSection />
        </main>
      </Container>
    </div>
  );
}

function S({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[80px] border-t border-[var(--rule)] pt-[var(--s-7)] pb-[var(--s-11)] first:border-t-0">
      <div className="mb-[var(--s-7)] flex flex-wrap items-baseline justify-between gap-[var(--s-4)]">
        <h2 className="doc-31 text-[var(--ink)]">{title}</h2>
        {note && <p className="ui-13 max-w-[46ch] text-[var(--ink-muted)]">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-5)] sm:grid-cols-[140px_1fr] sm:gap-[var(--s-7)]">
      <span className="eyebrow pt-[2px]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ── Type ───────────────────────────────────────────────────────────────── */

const DOC = [
  ["doc-64", "Um currículo é lido em nove segundos"],
  ["doc-45", "Um currículo é lido em nove segundos"],
  ["doc-31", "Um currículo é lido em nove segundos"],
  ["doc-26", "Um currículo é lido em nove segundos"],
  ["doc-21", "Um currículo é lido em nove segundos, depois que uma máquina já o leu."],
  ["doc-18", "Um currículo é lido em nove segundos, depois que uma máquina já o leu antes."],
  ["doc-15", "Um currículo é lido em nove segundos, depois que uma máquina já o leu antes."],
  ["doc-12", "Um currículo é lido em nove segundos, depois que uma máquina já o leu antes."],
] as const;

const UI = [
  ["ui-21", "Dialog title"], ["ui-19", "Toolbar title"], ["ui-17", "Primary button"],
  ["ui-15", "Base interface text — field values, list rows, buttons"],
  ["ui-13", "Metadata, help text, table header"], ["ui-12", "Dense table cell, chip, badge"],
  ["ui-11c", "The one micro-label"],
] as const;

function TypeSection() {
  return (
    <S id="type" title="Type" note="Three voices: the document (Source Serif 4), the interface (Public Sans), the machine (IBM Plex Mono). Each step carries its own tracking and leading — a size alone is not a style.">
      <p className="ui-13 mb-[var(--s-5)] text-[var(--ink-muted)]">Document scale · 6∶5 from an 18px base</p>
      {DOC.map(([cls, text]) => (
        <div key={cls} className="flex flex-col gap-[var(--s-2)] border-b border-[var(--rule-hairline)] py-[var(--s-4)] sm:flex-row sm:items-baseline sm:gap-[var(--s-7)]">
          <code className="mn-13 w-[72px] shrink-0 text-[var(--ink-muted)]">{cls}</code>
          <p className={`${cls} min-w-0 text-[var(--ink)]`}>{text}</p>
        </div>
      ))}

      <p className="ui-13 mt-[var(--s-9)] mb-[var(--s-5)] text-[var(--ink-muted)]">
        Interface scale · 9∶8 from a 15px base. Set at 0.874× the serif beside it, because the x-heights differ.
      </p>
      {UI.map(([cls, text]) => (
        <div key={cls} className="flex flex-col gap-[var(--s-2)] border-b border-[var(--rule-hairline)] py-[var(--s-3)] sm:flex-row sm:items-baseline sm:gap-[var(--s-7)]">
          <code className="mn-13 w-[72px] shrink-0 text-[var(--ink-muted)]">{cls}</code>
          <p className={`${cls} min-w-0 text-[var(--ink)]`}>{text}</p>
        </div>
      ))}

      <p className="ui-13 mt-[var(--s-9)] mb-[var(--s-5)] text-[var(--ink-muted)]">
        Machine readout · a number the machine produced is mono; a number the person pays is serif and duplexed.
      </p>
      <div className="flex flex-wrap items-baseline gap-[var(--s-9)]">
        <span className="mn-40 text-[var(--ink)]">89<span className="mn-24 text-[var(--ink-muted)]">%</span></span>
        <span className="mn-24 text-[var(--ink)]">100/100</span>
        <span className="mn-13 text-[var(--ink-2)]">gen_110aa835 · v4</span>
        <span className="doc-26 text-[var(--ink)]">R$ 149,00</span>
      </div>
      <div className="mt-[var(--s-7)] grid gap-[var(--s-3)] sm:grid-cols-2">
        <Well>111111<br />000000<br />123456</Well>
        <p className="ui-13 self-center text-[var(--ink-muted)]">
          Both mono lines measure the same width, and so do the serif ones: Source Serif 4 is duplexed.
          Fraunces is not — that is why it no longer sets a figure in this product.
        </p>
      </div>
    </S>
  );
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

const RAMP = [
  ["--sheet", "the document", "1.06 vs page"],
  ["--page", "app ground", "—"],
  ["--sunken", "wells, disabled", "1.09"],
  ["--zebra", "row banding, >12 rows", "1.15"],
  ["--rule-hairline", "inside a panel", "1.30"],
  ["--rule", "structural", "1.54"],
  ["--rule-field", "every interactive edge", "3.19 — passes 1.4.11"],
  ["--ink-40", "placeholder, disabled", "3.70"],
  ["--ink-muted", "metadata, help", "4.93"],
  ["--ink-2", "secondary body", "8.34"],
  ["--ink", "primary text and ground", "16.26"],
] as const;

const SEMANTIC = [
  ["--mark", "unverified · invalid · destructive", "7.95"],
  ["--kept", "verified · added · true", "7.30"],
  ["--query", "an open question", "5.02"],
] as const;

function Swatch({ token }: { token: string }) {
  return <span className="inline-block h-6 w-12 shrink-0 rounded-[var(--r-1)] border border-[var(--rule)]" style={{ background: `var(${token})` }} aria-hidden />;
}

function ColourSection() {
  return (
    <S id="colour" title="Colour" note="The page is paper, the type is ink, and the only colour is a mark made on the page. Ratios are measured against the ground named, not estimated.">
      <div className="grid gap-x-[var(--gutter)] gap-y-0 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-[var(--s-4)]">Neutral ramp</p>
          {RAMP.map(([token, use, ratio]) => (
            <div key={token} className="flex items-center gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)]">
              <Swatch token={token} />
              <code className="mn-13 w-[126px] shrink-0 text-[var(--ink-2)]">{token}</code>
              <span className="ui-13 min-w-0 flex-1 truncate text-[var(--ink-muted)]">{use}</span>
              <span className="mn-13 shrink-0 text-[var(--ink-muted)]">{ratio}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="eyebrow mb-[var(--s-4)]">Semantics — four meanings, no fifth</p>
          {SEMANTIC.map(([token, use, ratio]) => (
            <div key={token} className="flex items-center gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-3)]">
              <Swatch token={token} />
              <code className="mn-13 w-[70px] shrink-0 text-[var(--ink-2)]">{token}</code>
              <span className="ui-13 min-w-0 flex-1 text-[var(--ink-muted)]">{use}</span>
              <span className="mn-13 shrink-0 text-[var(--ink-muted)]">{ratio}</span>
            </div>
          ))}
          <div className="mt-[var(--s-7)] flex flex-col gap-[var(--s-3)]">
            <Notice tone="mark" icon="flag" title="A mark on the document">“Led a team of 40” is not in the CV you uploaded.</Notice>
            <Notice tone="kept" icon="check" title="Kept">Both keywords were already true of your experience.</Notice>
            <Notice tone="query" icon="search" title="An open question">How many people were on that team?</Notice>
          </div>
        </div>
      </div>
    </S>
  );
}

/* ── Space, radius ──────────────────────────────────────────────────────── */

function SpaceSection() {
  const steps = [["--s-2", 4], ["--s-3", 8], ["--s-4", 12], ["--s-5", 16], ["--s-6", 20], ["--s-7", 24], ["--s-8", 32], ["--s-9", 40], ["--s-10", 56], ["--s-11", 72], ["--s-12", 96]] as const;
  const radii = [["--r-0", "the sheet, tables, rules"], ["--r-1", "inputs, chips, tokens"], ["--r-2", "buttons, panels"], ["--r-3", "dialogs only"], ["--r-pill", "language switch, avatars"]] as const;
  return (
    <S id="space" title="Space & radius" note="A 4px grid, and a radius that encodes how much of a document an object is. Paper has square corners.">
      <div className="grid gap-[var(--s-9)] md:grid-cols-2">
        <div>
          {steps.map(([t, px]) => (
            <div key={t} className="flex items-center gap-[var(--s-4)] border-b border-[var(--rule-hairline)] py-[var(--s-2)]">
              <code className="mn-13 w-[54px] shrink-0 text-[var(--ink-muted)]">{t}</code>
              <span className="mn-13 w-[44px] shrink-0 text-right text-[var(--ink-muted)]">{px}px</span>
              <span className="h-3 bg-[var(--ink)]" style={{ width: px }} aria-hidden />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[var(--s-4)]">
          {radii.map(([t, use]) => (
            <div key={t} className="flex items-center gap-[var(--s-5)]">
              <span className="h-12 w-12 shrink-0 border border-[var(--rule-field)] bg-[var(--sunken)]" style={{ borderRadius: `var(${t})` }} aria-hidden />
              <div className="min-w-0">
                <code className="mn-13 block text-[var(--ink-2)]">{t}</code>
                <span className="ui-13 text-[var(--ink-muted)]">{use}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </S>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */

function IconSection() {
  return (
    <S id="icons" title="Icons" note="One local sprite, 28 marks, drawn twice — a 20 grid at 1.5px stroke and a 16 grid at 1.25px. A 20 shrunk to 16 is banned: the stroke thins and it stops matching the type.">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-y-[var(--s-6)]">
        {ICON_NAMES.map((n) => (
          <div key={n} className="flex flex-col items-center gap-[var(--s-3)] text-[var(--ink)]">
            <div className="flex items-end gap-[var(--s-4)]">
              <Icon name={n} size={20} />
              <Icon name={n} size={16} />
            </div>
            <span className="ui-12 text-center text-[var(--ink-muted)]">{n}</span>
          </div>
        ))}
      </div>
      <p className="ui-13 mt-[var(--s-7)] text-[var(--ink-muted)]">
        Beside text: <span className="ui-15 text-[var(--ink)]"><Icon name="download" size={16} /> Download the kit</span> — the 16 sits on the cap height, not the box.
      </p>
    </S>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <S id="buttons" title="Buttons" note="Four variants. Primary is ink and there is one per view; the red is destructive or corrective only. Disabled uses real tokens — 3.39:1 — because opacity fails contrast silently.">
      <Row label="Variants">
        <div className="flex flex-wrap items-center gap-[var(--s-4)]">
          <Button>Download the kit</Button>
          <Button variant="outline" icon="print">Print</Button>
          <Button variant="quiet" icon="history">Versions</Button>
          <Button variant="mark" icon="trash">Delete this version</Button>
        </div>
      </Row>
      <Row label="Sizes">
        <div className="flex flex-wrap items-center gap-[var(--s-4)]">
          <Button size="lg">Start free</Button>
          <Button size="md" variant="outline">Continue</Button>
          <Button size="sm" variant="outline">Add a line</Button>
        </div>
      </Row>
      <Row label="States">
        <div className="flex flex-wrap items-center gap-[var(--s-4)]">
          <Button>Rest</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>Disabled</Button>
          <Button loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 2200); }}>
            {loading ? "Tailoring…" : "Press to load"}
          </Button>
        </div>
      </Row>
      <Row label="Icon only">
        <div className="flex flex-wrap items-center gap-[var(--s-4)]">
          <Tooltip text="Copy the share link"><Button variant="outline" icon="copy" label="Copy the share link" /></Tooltip>
          <Tooltip text="Open in a new tab"><Button variant="outline" icon="external" label="Open in a new tab" /></Tooltip>
          <Tooltip text="Delete"><Button variant="outline" icon="trash" label="Delete" /></Tooltip>
          <span className="ui-13 text-[var(--ink-muted)]">Allowed only in a toolbar of three or more, each with a name and a tooltip.</span>
        </div>
      </Row>
      <Row label="As a link">
        <Button href="/pricing" variant="quiet" icon="arrow-right" iconEnd>See the packs</Button>
      </Row>
    </S>
  );
}

/* ── Fields ─────────────────────────────────────────────────────────────── */

function FieldSection() {
  const [job, setJob] = useState("Procuramos uma pessoa desenvolvedora sênior para liderar a plataforma de pagamentos.");
  return (
    <S id="fields" title="Fields" note="The label sits above the field and stays visible; a placeholder is not a label. The edge is 3.19:1 so the field is discernible without its placeholder.">
      <div className="grid gap-[var(--s-7)] md:grid-cols-2">
        <Field label="Your e-mail" help="Only used to send the kit." required>
          {(p) => <Input {...p} type="email" placeholder="voce@exemplo.com" />}
        </Field>
        <Field label="Target role" optional>
          {(p) => <Input {...p} defaultValue="Product Designer" />}
        </Field>
        <Field label="Seniority">
          {(p) => (
            <Select {...p} defaultValue="senior">
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="senior">Sênior</option>
            </Select>
          )}
        </Field>
        <Field label="Invalid" error="Paste at least 200 characters of the job ad.">
          {(p) => <Input {...p} defaultValue="dev" />}
        </Field>
        <Field label="Disabled" help="Waiting on the previous step.">
          {(p) => <Input {...p} disabled placeholder="Not yet" />}
        </Field>
        <Field label="Read-only" help="Set when the kit was generated.">
          {(p) => <Input {...p} readOnly defaultValue="gen_110aa835" />}
        </Field>
        <Field label="Paste the job ad" count={{ value: job.length, max: 8000 }} className="md:col-span-2">
          {(p) => <Textarea {...p} rows={4} value={job} onChange={(e) => setJob(e.target.value)} />}
        </Field>
      </div>

      <Row label="Choices">
        <div className="flex flex-wrap gap-x-[var(--s-8)] gap-y-[var(--s-4)]">
          <Checkbox label="Send me the PDF as well" defaultChecked />
          <Checkbox label="Keep my data after 30 days" />
          <Checkbox label="Unavailable here" disabled />
          <Radio name="d" label="Plain" defaultChecked />
          <Radio name="d" label="Ruled" />
          <Radio name="d" label="Ledger" />
        </div>
      </Row>
      <Row label="Loading">
        <div className="h-[var(--control-h)] rounded-[var(--r-1)] border border-[var(--rule-field)] bg-[var(--sheet)] px-[var(--s-4)] py-[11px]">
          <Skeleton w="42%" h={12} />
        </div>
      </Row>
    </S>
  );
}

/* ── Chips, tokens, badges ──────────────────────────────────────────────── */

function ChipSection() {
  const [on, setOn] = useState("all");
  return (
    <S id="chips" title="Chips, tokens, badges" note="Three different objects, so three different drawings. A chip is a choice you act on; a token is what the parser found; a badge is a status in a cell.">
      <Row label="Chip">
        <div className="flex flex-wrap gap-[var(--s-3)]">
          {["all", "applied", "interview", "offer"].map((k) => (
            <Chip key={k} selected={on === k} onClick={() => setOn(k)}>{k}</Chip>
          ))}
          <Chip icon="lock" disabled>archived</Chip>
          <Chip>read only</Chip>
        </div>
      </Row>
      <Row label="Token">
        <div className="flex flex-wrap gap-[var(--s-3)]">
          <Token state="kept">design systems</Token>
          <Token state="kept">figma</Token>
          <Token state="partial">accessibility</Token>
          <Token state="missing">design tokens</Token>
          <Token state="missing">react</Token>
          <Token>typescript</Token>
        </div>
      </Row>
      <Row label="Badge">
        <div className="flex flex-wrap items-center gap-[var(--s-5)]">
          <Badge>draft</Badge>
          <Badge tone="kept">sent</Badge>
          <Badge tone="query">waiting</Badge>
          <Badge tone="mark">rejected</Badge>
        </div>
      </Row>
      <Row label="Seal">
        <Seal>free · no signup · nothing stored</Seal>
      </Row>
    </S>
  );
}

/* ── Meter ──────────────────────────────────────────────────────────────── */

function MeterSection() {
  return (
    <S id="meter" title="Meter" note="One component for match, personalisation and “sounds human”, which today are three designs on one screen. Colour marks a threshold crossing, never the score; there is no red fill.">
      <div className="grid gap-[var(--s-9)] md:grid-cols-3">
        <Meter label="Match" value={89} before={41} caption="was 41% before the rewrite" />
        <Meter label="Personalisation" value={62} caption="12 of 19 lines mention this company" />
        <Meter label="Sounds human" value={34} caption="7 of 21 sentences read as written by a person" />
      </div>
    </S>
  );
}

/* ── Tables ─────────────────────────────────────────────────────────────── */

type KitRow = { id: string; title: string; company: string; match: number; cost: string; stage: string };
const KITS: KitRow[] = [
  { id: "k1", title: "Product Designer — Nubank", company: "Nubank", match: 89, cost: "0,42", stage: "sent" },
  { id: "k2", title: "Designer de Produto Sênior com foco em sistemas de design e acessibilidade", company: "iFood", match: 76, cost: "0,38", stage: "interview" },
  { id: "k3", title: "Staff Designer — Wise", company: "Wise", match: 54, cost: "0,51", stage: "draft" },
];

function TableSection() {
  const [page, setPage] = useState(1);
  const cols = [
    { key: "title", header: "Kit", clamp: 2 as const, cell: (r: KitRow) => r.title },
    { key: "company", header: "Company", cell: (r: KitRow) => r.company },
    { key: "stage", header: "Stage", cell: (r: KitRow) => <Badge tone={r.stage === "interview" ? "kept" : r.stage === "draft" ? "neutral" : "query"}>{r.stage}</Badge> },
    { key: "match", header: "Match", align: "right" as const, mono: true, cell: (r: KitRow) => `${r.match}%` },
    { key: "cost", header: "AI cost", align: "right" as const, cell: (r: KitRow) => `R$ ${r.cost}` },
  ];
  return (
    <S id="tables" title="Tables" note="Numbers right-aligned and tabular, header included. Rules between rows, zebra only above twelve. A long cell truncates at two lines rather than silently growing the row.">
      <Panel title="Recent kits" action={<Button size="sm" variant="quiet" icon="download">Export</Button>} flush>
        <Table rows={KITS} columns={cols} getKey={(r) => r.id} empty="No kits yet." />
        <div className="px-[var(--cell-x)] pb-[var(--s-4)]">
          <Pagination page={page} perPage={20} total={143} onPage={setPage} />
        </div>
      </Panel>
      <p className="eyebrow mt-[var(--s-9)] mb-[var(--s-4)]">Empty — the header stays, so the columns stay legible</p>
      <Panel flush><Table rows={[]} columns={cols} getKey={(r: KitRow) => r.id} empty="Nothing here yet. Your first kit will appear the moment it finishes." /></Panel>
      <p className="eyebrow mt-[var(--s-9)] mb-[var(--s-4)]">Loading</p>
      <Panel flush><SkeletonRows rows={3} cols={["38%", "16%", "12%", "10%"]} className="px-[var(--cell-x)]" /></Panel>
    </S>
  );
}

/* ── Surfaces ───────────────────────────────────────────────────────────── */

function SurfaceSection() {
  return (
    <S id="surfaces" title="Surfaces" note="Depth is reached for in order: a rule, then a background step, then an inset, and a shadow last. Two shadows exist in the whole system and the sheet owns one of them.">
      <div className="grid gap-[var(--s-7)] md:grid-cols-2">
        <Panel title="A panel in the page">
          <p className="ui-15 text-[var(--ink-2)]">A rule and nothing else. It does not float, so it does not cast.</p>
        </Panel>
        <Panel title="A raised panel" raised>
          <p className="ui-15 text-[var(--ink-2)]">One background step off the page. Still no shadow.</p>
        </Panel>
      </div>
      <div className="mt-[var(--s-7)]">
        <Well>
          {"ALEX SOUSA\nProduct Designer · São Paulo\n\nEXPERIENCE\nNubank — Product Designer (2021–)\n  · Led the design system used by 40 engineers"}
        </Well>
        <p className="ui-13 mt-[var(--s-3)] text-[var(--ink-muted)]">An inset well, in the machine&rsquo;s voice: this is the text a parser sees.</p>
      </div>

      <p className="eyebrow mt-[var(--s-9)] mb-[var(--s-4)]">The sheet — the one object allowed to look like a physical page</p>
      <Sheet className="max-w-[560px]">
        <h1 className="doc-31 text-[var(--ink)]">Alex Sousa</h1>
        <p className="mn-13 mt-[var(--s-2)] text-[var(--ink-2)]">alex@exemplo.com · +55 11 90000-0000 · São Paulo</p>
        <div className="mt-[var(--s-4)] h-[2px] w-full bg-[var(--mark)]" aria-hidden />
        <h2 className="ui-11c mt-[var(--s-6)] text-[var(--ink-muted)]">Experiência</h2>
        <h3 className="doc-18 mt-[var(--s-3)] font-semibold text-[var(--ink)]">Nubank — Product Designer</h3>
        <p className="doc-15 text-[var(--ink-muted)]">2021 — presente</p>
        <ul className="doc-15 mt-[var(--s-3)] flex flex-col gap-[var(--s-2)] text-[var(--ink-2)]">
          <li className="hang">· Conduziu o design system usado por 40 pessoas de engenharia.</li>
          <li className="hang">· Reduziu o tempo de criação de telas em 38%.</li>
        </ul>
      </Sheet>
    </S>
  );
}

/* ── States ─────────────────────────────────────────────────────────────── */

function StateSection() {
  return (
    <S id="states" title="States" note="Empty, loading, error and focus are designed at the same time as the happy path. Tab through this section: every ring is the same ring.">
      <Row label="Empty">
        <EmptyState title="Nenhuma candidatura ainda." action={<Button variant="outline" icon="plus">Add the first one</Button>}>
          When you send a kit, it appears here with its stage and its dates.
        </EmptyState>
      </Row>
      <Row label="Loading">
        <div className="flex flex-col gap-[var(--s-3)]">
          <Skeleton w="60%" h={20} />
          <Skeleton w="100%" h={12} />
          <Skeleton w="82%" h={12} />
        </div>
      </Row>
      <Row label="Error">
        <Notice tone="mark" icon="flag" title="We could not read that PDF" action={<Button size="sm" variant="outline">Try another file</Button>}>
          It looks like a scan. Paste the text instead, or upload the .docx.
        </Notice>
      </Row>
      <Row label="Focus ring">
        <div className="flex flex-wrap items-center gap-[var(--s-5)]">
          <Button variant="outline">Tab to me</Button>
          <Input className="max-w-[220px]" placeholder="…and to me" />
          <Checkbox label="…and me" />
          <span className="ui-13 text-[var(--ink-muted)]">2px --mark at 2px offset, 7.95:1 on paper.</span>
        </div>
      </Row>
    </S>
  );
}

/* ── Navigation ─────────────────────────────────────────────────────────── */

function NavSection() {
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState("resume");
  return (
    <S id="nav" title="Navigation" note="The stepper always shows the true total — today's string says “step 1 of 2” and then shows four. Tabs move with the arrow keys.">
      <Row label="Stepper">
        <div className="flex flex-col gap-[var(--s-5)]">
          <Stepper steps={["Sobre você", "A vaga", "Ajustes", "Pronto"]} current={step} onGo={setStep} />
          <div className="flex gap-[var(--s-3)]">
            <Button size="sm" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button size="sm" onClick={() => setStep((s) => Math.min(3, s + 1))}>Next</Button>
          </div>
        </div>
      </Row>
      <Row label="Tabs">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "resume", label: "Currículo" }, { id: "letter", label: "Carta" }, { id: "checks", label: "Verificações" }]} />
      </Row>
      <Row label="Breadcrumb">
        <Breadcrumb trail={[{ label: "Meus currículos", href: "/library" }, { label: "Nubank", href: "/library" }, { label: "v4" }]} />
      </Row>
    </S>
  );
}

/* ── Overlays ───────────────────────────────────────────────────────────── */

function OverlaySection() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<null | "kept" | "mark">(null);
  return (
    <S id="overlays" title="Overlays" note="Focus moves in, Tab stays inside, Escape closes, focus returns. Nothing floats over content permanently — the support circle is gone.">
      <Row label="Open one">
        <div className="flex flex-wrap gap-[var(--s-4)]">
          <Button variant="outline" onClick={() => setDialog(true)}>Dialog</Button>
          <Button variant="outline" onClick={() => setDrawer(true)}>Drawer</Button>
          <Button variant="outline" onClick={() => setToast("kept")}>Toast</Button>
          <Button variant="outline" onClick={() => setToast("mark")}>Toast — a mark</Button>
          <Tooltip text="A tooltip names an icon-only control"><Button variant="outline" icon="eye" label="Preview" /></Tooltip>
        </div>
      </Row>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Delete this version?"
        actions={<><Button variant="quiet" onClick={() => setDialog(false)}>Keep it</Button><Button variant="mark" icon="trash" onClick={() => setDialog(false)}>Delete v4</Button></>}
      >
        v4 was generated on 14 September and has not been downloaded. Deleting it does not affect the kit it came from.
      </Dialog>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Versions">
        <SkeletonRows rows={3} cols={["55%", "25%"]} />
      </Drawer>

      {toast && <Toast tone={toast} message={toast === "mark" ? "That file could not be read." : "Saved. v5 is now the one you share."} onDone={() => setToast(null)} />}
    </S>
  );
}

/* ── Layouts ────────────────────────────────────────────────────────────── */

function Block({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-[var(--r-1)] border border-dashed border-[var(--rule-field)] bg-[var(--sunken)] ${tall ? "h-[180px]" : "h-[92px]"}`}>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

function LayoutSection() {
  return (
    <S id="layouts" title="Layouts" note="Four named layouts replace the centred max-w-6xl full of equal cards. Each states where it stacks; a layout without a stacking rule overlaps on a phone.">
      <p className="eyebrow mb-[var(--s-4)]">L-editorial · 7 / 1 / 4 — the default</p>
      <Editorial aside={<Block label="the 4" tall />}><Block label="the 7" tall /></Editorial>

      <p className="eyebrow mt-[var(--s-9)] mb-[var(--s-4)]">L-document · 816 + 320, rail under the sheet below 1280</p>
      <DocumentLayout rail={<Block label="rail · compact" tall />}><Block label="the sheet" tall /></DocumentLayout>

      <p className="eyebrow mt-[var(--s-9)] mb-[var(--s-4)]">L-prose · the measure, offset into columns 2–8</p>
      <div className="border border-[var(--rule-hairline)] p-[var(--s-5)]">
        <p className="doc-18 measure text-[var(--ink-2)]">
          Sessenta e seis caracteres por linha é o que um olho segue sem se perder no retorno. Mais do que isso e a
          linha seguinte é procurada; menos e o texto vira uma coluna de jornal. Esta medida vale para toda a prosa do
          produto, em qualquer largura de tela.
        </p>
      </div>
      <Rule className="mt-[var(--s-12)]" />
      <p className="ui-13 mt-[var(--s-5)] text-[var(--ink-muted)]">
        docs/DESIGN.md is the written system; this page is the rendered one. If they disagree, one of them is a bug.
      </p>
    </S>
  );
}
