import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";
import { aiReady } from "@/lib/ai/health";
import { insightsEnabled } from "@/lib/ai/insights";
import { paymentsConfig } from "@/lib/server/payments";
import { envNumber, supportContacts } from "@/lib/server/env";
import { ttsProvider } from "@/lib/server/tts";

export const dynamic = "force-dynamic";

/** Who is signed in, plus what this server can actually do right now (drives banners and copy). */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({
    user, aiReady: aiReady(),
    payments: paymentsConfig(),
    support: supportContacts(),
    features: { insights: insightsEnabled(), voice: !!ttsProvider() },
    // Per-kit caps, so pricing states what one credit really unlocks on this server.
    limits: {
      deepen: envNumber("KIT_DEEPEN_MAX", 2), interviews: envNumber("INTERVIEW_MAX_SESSIONS_PER_KIT", 5), quantify: envNumber("KIT_QUANTIFY_MAX", 1),
      intl: envNumber("KIT_INTL_MAX", 2), pitch: envNumber("PITCH_FEEDBACK_MAX_PER_KIT", 5),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
