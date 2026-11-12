import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { releaseHold } from "@/lib/checkout-hold";
import { confirmPaidOrder, verifyStripeSignature } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { client_reference_id?: string; payment_intent?: string | null; payment_status?: string; amount_total?: number | null } };
  };
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const number = event.data.object.client_reference_id;
    if (number) await confirmPaidOrder(number, event.data.object.payment_intent ?? null, event.data.object.amount_total ?? undefined);
  }
  if (event.type === "checkout.session.expired") {
    const number = event.data.object.client_reference_id;
    if (number) await releaseHold(db, number, "Session de paiement expirée");
  }
  return NextResponse.json({ received: true });
}
