import { bad, type Owner, type Reply } from "@/lib/server/http";
import { getGeneration, ownsGeneration, type GenerationRow } from "@/lib/server/generations";

/**
 * The kit behind a route, for its owner only: someone else's (or a missing) kit is a 404, and
 * `unlocked: true` refuses a locked kit with 403.
 */
export function ownedKit(id: string, owner: Owner, opts: { unlocked?: boolean } = {}): { row: GenerationRow } | { reply: Reply } {
  const row = getGeneration(id);
  if (!row || !ownsGeneration(row, owner.userId, owner.anonId)) return { reply: bad("not_found", 404) };
  if (opts.unlocked && row.unlocked !== 1) return { reply: bad("unlock_first", 403) };
  return { row };
}
