import { Meter, Token } from "@/components/ui";

export type Keyword = { term: string; before: boolean; after: boolean };

/**
 * The match (surface 5). It was a gradient card with two competing numerals, an arrow drawn in SVG
 * and a row of green pills. It is now the system's one Meter — the same object the landing demo
 * and the personalisation reading use — with the job's terms as tokens: present, or not yet.
 */
export function MatchScore({
  before,
  after,
  keywords,
  addedLabel,
}: {
  before: number;
  after: number;
  keywords: Keyword[];
  addedLabel?: (n: number) => string;
}) {
  const added = keywords.filter((k) => k.after && !k.before);
  const shown = keywords.slice(0, 12);
  const label = addedLabel ?? ((n: number) => `+${n} keywords added that the job screens for.`);

  return (
    <section className="border-t border-[var(--rule)] pt-[var(--s-5)]">
      <Meter
        label="Resume → job match"
        value={after}
        before={before}
        caption={added.length > 0 ? `${label(added.length)} Was ${before}%.` : `Was ${before}% before the rewrite. An estimate, not a promise.`}
      />
      {shown.length > 0 && (
        <ul className="mt-[var(--s-5)] flex flex-wrap gap-[var(--s-2)]">
          {shown.map((k) => (
            <li key={k.term}>
              <Token state={k.after ? "kept" : "missing"}>{k.term}</Token>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
