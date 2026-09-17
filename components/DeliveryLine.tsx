"use client";

import { useI18n } from "@/app/i18n/I18nProvider";
import type { Delivery } from "@/lib/speech/metrics";

/** "Ritmo: bom · 132 palavras/min · Vícios: né ×2" — bands, not verdicts. */
export function DeliveryLine({ d }: { d: Delivery }) {
  const { r } = useI18n();
  const P = r.pitch;
  return (
    <div className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm" data-testid="delivery">
      <p className="eyebrow">{P.delivery}</p>
      <p className="mt-1 text-ink-2">
        <span data-testid="delivery-pace"><strong className="text-ink">{P.pace}:</strong> {d.pace ? `${P.paceLabel[d.pace]} · ${P.wpm(d.wpm)}` : P.notMeasured}</span>
        {" · "}
        <span data-testid="delivery-fillers"><strong className="text-ink">{P.fillers}:</strong> {d.fillers ? `${d.fillers} (${d.fillerWords.map((f) => `${f.word} ×${f.count}`).join(", ")})` : P.fillersNone}</span>
        {d.repeated.length > 0 && <> · <strong className="text-ink">{P.repeated}:</strong> {d.repeated.map((w) => `${w.word} ×${w.count}`).join(", ")}</>}
        {d.longestPauseSec !== null && <> · {P.pause(d.longestPauseSec)}</>}
      </p>
    </div>
  );
}
