import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { extra } from "@/app/i18n/extra";
import type { Kit, Lang } from "@/lib/ai/kit";
import { decideAccess, stripContact } from "@/lib/resume/public";
import { getGeneration } from "@/lib/server/generations";
import { bumpViews, getPublicBySlug, pinCookieName, pinTokenValid, type PublicResumeRow } from "@/lib/server/publicResumes";
import { currentUser } from "@/lib/server/session";
import { PinForm } from "./PinForm";
import { ShareBar } from "./ShareBar";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const langOf = (l: string): Lang => (["en", "pt", "es"].includes(l) ? (l as Lang) : "en");

async function load(slug: string) {
  const row = getPublicBySlug(slug);
  const cookie = (await cookies()).get(pinCookieName(slug))?.value;
  const user = await currentUser();
  const isOwner = !!row && user?.id === row.userId;
  const access = decideAccess(row ? { enabled: row.enabled === 1, hasPin: !!row.pinHash } : null, row ? pinTokenValid(row, cookie) : false, isOwner);
  const gen = row && (access === "ok" || access === "pin") ? getGeneration(row.generationId) : null;
  return { row, access: gen ? access : ("missing" as const), gen, isOwner };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { row, access, gen } = await load(slug);
  if (!row || !gen || access === "missing" || access === "off") return { title: "ResumeTailor", robots: { index: false, follow: false } };
  const C = extra[langOf(gen.lang)].cv;
  const open = access === "ok" && row.indexable === 1;
  const title = access === "pin" ? C.pinTitle : `${gen.title}${gen.targetRole ? ` — ${gen.targetRole}` : ""}`;
  return {
    title: `${title} | ResumeTailor`,
    description: access === "pin" ? C.pinIntro : C.description(gen.title, gen.targetRole),
    robots: { index: open, follow: open },
    alternates: { canonical: `${BASE}/cv/${slug}` },
    openGraph: { title, description: access === "pin" ? C.pinIntro : C.description(gen.title, gen.targetRole), url: `${BASE}/cv/${slug}`, type: "profile" },
  };
}

/**
 * /cv/[slug] — a kit published as a web résumé. Mobile-first, semantic HTML from the kit's own
 * Markdown (so parsers read it), in the template the owner chose. Off, missing and unknown all
 * look the same from outside (404); a PIN gate shows only the form until this browser verifies.
 */
export default async function PublicResumePage({ params }: Props) {
  const { slug } = await params;
  const { row, access, gen, isOwner } = await load(slug);
  if (!row || !gen || access === "missing" || access === "off") notFound();
  const lang = langOf(gen.lang);
  const C = extra[lang].cv;

  if (access === "pin") {
    return (
      <Shell lang={lang}>
        <div className="card mx-auto mt-16 max-w-md p-8 text-center" data-testid="cv-pin">
          <p className="text-4xl">🔒</p>
          <h1 className="font-display mt-4 text-2xl text-ink">{C.pinTitle}</h1>
          <p className="mt-2 text-sm text-ink-2">{C.pinIntro}</p>
          <PinForm slug={slug} labels={{ placeholder: C.pinPh, submit: C.pinSubmit, wrong: C.pinWrong }} />
        </div>
      </Shell>
    );
  }

  if (!isOwner) bumpViews(row.id);
  const kit = JSON.parse(gen.result) as Kit;
  const markdown = row.hideContact === 1 ? stripContact(kit.resume) : kit.resume;
  const shareUrl = `${BASE}/cv/${slug}`;

  return (
    <Shell lang={lang}>
      {isOwner && <OwnerBar row={row} gen={{ id: gen.id }} copy={C} />}
      <div className="mx-auto mt-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-1">
        <p className="eyebrow">{C.eyebrow}</p>
        <ShareBar url={shareUrl} text={C.shareText(gen.title)} labels={{ share: C.share, copy: C.copy, copied: C.copied, whatsapp: C.whatsapp, linkedin: C.linkedin }} />
      </div>
      <article className="mx-auto mt-3 w-full max-w-[210mm] rounded-2xl bg-white p-6 shadow-lg sm:p-[14mm]" data-testid="cv-document" data-template={row.template}>
        <div className={`doc-${row.template}`}><ReactMarkdown>{markdown}</ReactMarkdown></div>
        {row.hideContact === 1 && <p className="mt-6 border-t border-edge pt-3 text-xs text-muted" data-testid="cv-contact-hidden">{C.contactHidden}</p>}
      </article>
      <p className="mx-auto mt-8 max-w-[210mm] text-center text-xs text-muted">
        {C.madeWith} · <Link href="/" className="font-medium text-oxblood underline-offset-4 hover:underline">{C.makeYours}</Link>
      </p>
    </Shell>
  );
}

function Shell({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  return (
    <div className="min-h-screen bg-paper-2 px-4 pb-16 pt-6 sm:px-6" lang={lang === "pt" ? "pt-BR" : lang}>
      <div className="mx-auto flex max-w-[210mm] items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="ResumeTailor">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink font-display text-base leading-none text-paper">R</span>
          <span className="font-display text-lg tracking-tight text-ink">Resume<span className="text-oxblood">Tailor</span></span>
        </Link>
      </div>
      {children}
    </div>
  );
}

function OwnerBar({ row, gen, copy }: { row: PublicResumeRow; gen: { id: string }; copy: (typeof extra)["en"]["cv"] }) {
  return (
    <div className="mx-auto mt-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 rounded-xl border border-gold bg-gold-2 px-4 py-2 text-sm text-ink" data-testid="cv-owner">
      <span>{copy.owner(row.views)}</span>
      <Link href={`/start?gen=${gen.id}`} className="font-medium text-oxblood underline-offset-4 hover:underline">{copy.edit} →</Link>
    </div>
  );
}
