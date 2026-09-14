import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";
import { aiConfigured } from "@/lib/ai/client";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({
    user, aiReady: aiConfigured(),
    payments: { stripe: !!process.env.STRIPE_SECRET_KEY, mercadopago: !!process.env.MP_ACCESS_TOKEN },
  });
}
