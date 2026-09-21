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
import { baseUrl } from "@/lib/server/env";
import { launch } from "@/app/i18n/launch";
import { PinForm } from "./PinForm";
import { ShareBar } from "./ShareBar";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
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
    alternates: { canonical: `/cv/${slug}` },
    openGraph: { title, description: access === "pin" ? C.pinIntro : C.description(gen.title, gen.targetRole), url: `/cv/${slug}`, type: "profile" },
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
        <div className="mx-auto mt-[var(--s-12)] max-w-[420px] rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] p-[var(--s-7)]" data-testid="cv-pin">
          <span className="text-[color:var(--ink-muted)]"><Icon name="lock" /></span>
          <h1 className="doc-26 mt-[var(--s-4)] text-[color:var(--ink)]">{C.pinTitle}</h1>
          <p className="mt-[var(--s-3)] font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[color:var(--ink-muted)]">{C.pinIntro}</p>
          <PinForm slug={slug} labels={{ placeholder: C.pinPh, submit: C.pinSubmit, wrong: C.pinWrong, locked: launch[lang].pin.locked }} />
        </div>
      </Shell>
    );
  }

  if (!isOwner) bumpViews(row.id);
  const kit = JSON.parse(gen.result) as Kit;
  const markdown = row.hideContact === 1 ? stripContact(kit.resume) : kit.resume;
  const shareUrl = `${baseUrl()}/cv/${slug}`;

  return (
    <Shell lang={lang}>
      {isOwner && <OwnerBar row={row} gen={{ id: gen.id }} copy={C} />}
      <div className="mx-auto mt-[var(--s-7)] flex w-full max-w-[816px] flex-wrap items-center justify-between gap-[var(--s-4)]">
        <p className="eyebrow">{C.eyebrow}</p>
        <ShareBar url={shareUrl} text={C.shareText(gen.title)} labels={{ share: C.share, copy: C.copy, copied: C.copied, whatsapp: C.whatsapp, linkedin: C.linkedin }} />
      </div>
      {/* The same sheet, the same document stylesheet, as the editor preview and /print. */}
      <article className="sheet mx-auto mt-[var(--s-3)] w-full max-w-[816px] p-[var(--s-7)] sm:p-[56px]" data-testid="cv-document" data-template={row.template}>
        <div className={`doc-${row.template}`}><ReactMarkdown>{markdown}</ReactMarkdown></div>
        {row.hideContact === 1 && (
          <p className="mt-[var(--s-7)] border-t border-[var(--rule-hairline)] pt-[var(--s-3)] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]" data-testid="cv-contact-hidden">{C.contactHidden}</p>
        )}
      </article>
      <p className="mx-auto mt-[var(--s-9)] max-w-[816px] font-sans text-[length:var(--ui-12)] text-[color:var(--ink-muted)]">
        {C.madeWith} · <Link href="/" className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{C.makeYours}</Link>
        {" · "}<Link href={`/legal/privacy?lang=${lang}`} className="underline-offset-2 hover:underline">{launch[lang].footer.privacy}</Link>
        {" · "}<Link href={`/legal/terms?lang=${lang}`} className="underline-offset-2 hover:underline">{launch[lang].footer.terms}</Link>
      </p>
    </Shell>
  );
}

function Shell({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  return (
    <div className="min-h-screen bg-[var(--page)] px-[var(--s-5)] pb-[var(--s-12)] pt-[var(--s-6)] sm:px-[var(--s-7)]" lang={lang === "pt" ? "pt-BR" : lang}>
      <div className="mx-auto flex max-w-[816px] items-center justify-between">
        <Link href="/" className="flex items-center gap-[var(--s-3)]" aria-label="ResumeTailor">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--r-0)] bg-[var(--ink)] font-serif text-[15px] font-semibold leading-none text-[color:var(--on-ink)]">R</span>
          <span className="font-serif text-[19px] font-semibold leading-none tracking-[-0.014em] text-[color:var(--ink)]">Resume<span className="font-normal text-[color:var(--ink-2)]">Tailor</span></span>
        </Link>
      </div>
      {children}
    </div>
  );
}

function OwnerBar({ row, gen, copy }: { row: PublicResumeRow; gen: { id: string }; copy: (typeof extra)["en"]["cv"] }) {
  return (
    <div className="mx-auto mt-[var(--s-5)] flex max-w-[816px] flex-wrap items-center justify-between gap-[var(--s-3)] rounded-[var(--r-1)] bg-[var(--query-wash)] px-[var(--s-5)] py-[var(--s-3)] font-sans text-[length:var(--ui-13)] text-[color:var(--ink-2)]" style={{ borderLeft: "2px solid var(--query)" }} data-testid="cv-owner">
      <span>{copy.owner(row.views)}</span>
      <Link href={`/start?gen=${gen.id}`} className="font-medium text-[color:var(--ink)] underline decoration-[var(--rule-field)] underline-offset-[3px]">{copy.edit} →</Link>
    </div>
  );
}
