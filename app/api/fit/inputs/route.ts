import { withOwner } from "@/lib/server/http";
import { lastTailorInputs } from "@/lib/server/fit";

/** The caller's last tailored kit's posting and résumé, so the pre-check can reuse them. Nobody else's. */
export async function GET() {
  return withOwner(async (owner) => ({ body: { inputs: lastTailorInputs(owner.userId, owner.anonId) } }));
}
