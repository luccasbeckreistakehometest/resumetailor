"use client";

import type { GenerationView } from "@/lib/server/generations";

/** Truth check and "what changed" (filled in by the truth-check step). */
export function KitChecks(props: { gen: GenerationView; resume: string; onReplace: (text: string) => void; view: "truth" | "diff"; onEdit?: () => void }) {
  void props;
  return null;
}
