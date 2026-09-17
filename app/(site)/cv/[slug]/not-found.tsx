import Link from "next/link";

/** An unpublished, deleted or unknown résumé link. The same page for all three, so nothing is inferred. */
export default function ResumeNotFound() {
  return (
    <div className="min-h-screen bg-paper-2 px-5 py-24 text-center">
      <p className="text-4xl">📄</p>
      <h1 className="font-display mt-4 text-3xl text-ink">This résumé isn&apos;t available</h1>
      <p className="mt-2 text-ink-2">Esse currículo não está disponível · Este CV no está disponible</p>
      <p className="mt-1 text-sm text-muted">The owner may have switched it off, or the link is wrong.</p>
      <Link href="/" className="btn btn-ghost mt-8">ResumeTailor</Link>
    </div>
  );
}
