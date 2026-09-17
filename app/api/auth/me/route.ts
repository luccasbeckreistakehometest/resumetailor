import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";
import { aiReady } from "@/lib/ai/health";
import { insightsEnabled } from "@/lib/ai/insights";
import { paymentsConfig } from "@/lib/server/payments";
import { supportContacts } from "@/lib/server/env";
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
  }, { headers: { "Cache-Control": "no-store" } });
}
