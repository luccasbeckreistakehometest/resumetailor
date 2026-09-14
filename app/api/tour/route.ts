import { z } from "zod";
import { withOwner } from "@/lib/server/http";
import { getOnboarding, recordEvent, setTourStep } from "@/lib/server/onboarding";

export async function GET() {
  return withOwner(async (owner) => {
    const o = getOnboarding(owner.key);
    return { body: { tourCompleted: o.tourCompleted === 1, tourStep: o.tourStep, firstSeenAt: o.firstSeenAt } };
  });
}

const schema = z.object({ step: z.number().int().min(0).max(50).optional(), completed: z.boolean().optional(), event: z.string().max(40).optional(), meta: z.record(z.string(), z.unknown()).optional() });

/** Progress and first-session events land here; the tour is also what the admin panel measures. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  return withOwner(async (owner) => {
    if (!parsed.success) return { body: { error: "bad request" }, status: 400 };
    const { step, completed, event, meta } = parsed.data;
    if (event) recordEvent(owner.key, event, meta);
    const o = step !== undefined || completed !== undefined ? setTourStep(owner.key, step ?? getOnboarding(owner.key).tourStep, completed ?? false) : getOnboarding(owner.key);
    return { body: { tourCompleted: o.tourCompleted === 1, tourStep: o.tourStep } };
  });
}
