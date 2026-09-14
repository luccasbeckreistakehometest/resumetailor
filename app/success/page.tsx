"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { markPaid, saveToLibrary, titleFromResult, StoredResult, InterviewPrep } from "@/lib/library";

type Result = {
  coverLetter: string;
  resume: string;
  linkedinAbout?: string;
  emphasis?: string[];
  interviewPrep?: InterviewPrep;
  matchNotes: string;
};

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PrepBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{label}</div>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-indigo-400" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessInner() {
  const params = useSearchParams();
  const { d } = useI18n();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"checking" | "paid" | "unpaid" | "error">("checking");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let full: StoredResult | null = null;
    const stored = localStorage.getItem("rt_result");
    if (stored) {
      try {
        full = JSON.parse(stored) as StoredResult;
        setResult(full as Result);
      } catch {}
    }
    if (!sessionId) {
      setStatus("error");
      return;
    }
    fetch(`/api/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.paid) {
          markPaid();
          if (full) {
            saveToLibrary({
              id: sessionId,
              title: titleFromResult(full),
              mode: "tailor",
              matchAfter: full.matchAfter ?? 0,
              createdAt: Date.now(),
              result: full,
            });
          }
          setStatus("paid");
        } else {
          setStatus("unpaid");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  if (status === "checking") {
    return <p className="py-20 text-center text-gray-500">Confirming your payment...</p>;
  }

  if (status !== "paid") {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">We couldn&apos;t confirm your payment.</p>
        <a href="/" className="mt-4 inline-block text-blue-600 underline">
          Go back and try again
        </a>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-700">
          Payment confirmed — but we couldn&apos;t find your generated documents in this browser.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Use the same browser/device where you generated them, or generate again.
        </p>
        <a href="/" className="mt-4 inline-block text-blue-600 underline">
          Back to start
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800">
        🎉 Payment confirmed! Your tailored documents are unlocked below. Good luck — go get it.
      </div>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
        <h2 className="text-lg font-semibold">Download your resume as PDF</h2>
        <p className="mt-1 text-sm text-gray-600">
          Pick from 5 templates — an ATS-safe one for online portals, or a designed one to print and hand over in person.
        </p>
        <a
          href="/print"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Choose a template & download PDF →
        </a>
      </section>

      <section className="rounded-lg border border-gray-200 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cover letter</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(result.coverLetter)}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Copy
            </button>
            <button
              onClick={() => download("cover-letter.txt", result.coverLetter)}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              Download
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-gray-800">{result.coverLetter}</p>
      </section>

      <section className="rounded-lg border border-gray-200 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tailored resume</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(result.resume)}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Copy
            </button>
            <button
              onClick={() => download("tailored-resume.md", result.resume)}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              Download
            </button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{result.resume}</pre>
      </section>

      {result.linkedinAbout && (
        <section className="rounded-lg border border-gray-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">LinkedIn “About” section</h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(result.linkedinAbout || "")}
                className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Copy
              </button>
              <button
                onClick={() => download("linkedin-about.txt", result.linkedinAbout || "")}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                Download
              </button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-800">{result.linkedinAbout}</p>
        </section>
      )}

      {(result.emphasis?.length || result.interviewPrep) && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
          <h2 className="text-lg font-semibold text-slate-900">🎯 {d.prep.title}</h2>

          {result.emphasis && result.emphasis.length > 0 && (
            <PrepBlock label={d.prep.emphasis} items={result.emphasis} />
          )}
          {result.interviewPrep?.talkingPoints && result.interviewPrep.talkingPoints.length > 0 && (
            <PrepBlock label={d.prep.talkingPoints} items={result.interviewPrep.talkingPoints} />
          )}
          {result.interviewPrep?.technical && result.interviewPrep.technical.length > 0 && (
            <PrepBlock label={d.prep.technical} items={result.interviewPrep.technical} />
          )}
          {result.interviewPrep?.behavioral && result.interviewPrep.behavioral.length > 0 && (
            <PrepBlock label={d.prep.behavioral} items={result.interviewPrep.behavioral} />
          )}
          {result.interviewPrep?.questionsToAsk && result.interviewPrep.questionsToAsk.length > 0 && (
            <PrepBlock label={d.prep.questionsToAsk} items={result.interviewPrep.questionsToAsk} />
          )}
        </section>
      )}

      {result.matchNotes && (
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Why you fit</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{result.matchNotes}</p>
        </section>
      )}

      <div className="flex items-center justify-center gap-5 text-sm text-gray-400">
        <Link href="/library" className="hover:text-gray-600">
          My CVs
        </Link>
        <a href="/" className="hover:text-gray-600">
          Tailor another application →
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Suspense fallback={<p className="py-20 text-center text-gray-500">Loading...</p>}>
        <SuccessInner />
      </Suspense>
    </main>
  );
}
