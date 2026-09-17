"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { InterviewSession } from "@/components/InterviewSession";

function InterviewInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <InterviewSession generationId={id ?? ""} initialSessionId={search.get("session")} />;
}

/** /interview/[kit id] — the mock interview for one kit; `?session=` resumes a saved one. */
export default function InterviewPage() {
  return <Suspense fallback={null}><InterviewInner /></Suspense>;
}
