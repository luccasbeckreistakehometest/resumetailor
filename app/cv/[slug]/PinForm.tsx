"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Asks for the page's PIN; a correct one sets the verified cookie and the server re-renders the résumé. */
export function PinForm({ slug, labels }: { slug: string; labels: { placeholder: string; submit: string; wrong: string } }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setWrong(false);
    const r = await fetch(`/api/cv/${slug}/pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    setBusy(false);
    if (!r.ok) { setWrong(true); return; }
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-5 flex gap-2">
      <input className="field text-center tracking-[0.3em]" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={labels.placeholder} autoComplete="one-time-code" inputMode="text" maxLength={12} data-testid="cv-pin-input" autoFocus />
      <button className="btn btn-primary" disabled={busy || !pin} data-testid="cv-pin-submit">{labels.submit}</button>
      {wrong && <p className="sr-only" role="alert">{labels.wrong}</p>}
      {wrong && <span className="absolute" aria-hidden />}
      {wrong && <p className="absolute left-0 right-0 mt-14 text-sm text-oxblood" data-testid="cv-pin-wrong">{labels.wrong}</p>}
    </form>
  );
}
