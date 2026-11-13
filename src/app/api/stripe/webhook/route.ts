import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { releaseHold } from "@/lib/checkout-hold";
import { connectState } from "@/lib/stripe-connect";
import { confirmPaidOrder, verifyStripeSignature } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((x): x is string => Boolean(x));
  if (secrets.length === 0) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!secrets.some((s) => verifyStripeSignature(payload, sig, s))) {
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { id?: string; details_submitted?: boolean; payouts_enabled?: boolean; capabilities?: { transfers?: string }; requirements?: { currently_due?: string[] }; client_reference_id?: string; payment_intent?: string | null; payment_status?: string; amount_total?: number | null } };
  };
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const number = event.data.object.client_reference_id;
    if (number) await confirmPaidOrder(number, event.data.object.payment_intent ?? null, event.data.object.amount_total ?? undefined);
  }
  if (event.type === "checkout.session.expired") {
    const number = event.data.object.client_reference_id;
    if (number) await releaseHold(db, number, "Session de paiement expirée");
  }
  if (event.type === "account.updated" && event.data.object.id) {
    const st = connectState(event.data.object);
    await db.supplier.updateMany({
      where: { stripeAccountId: event.data.object.id },
      data: { stripeConnectStatus: st.status, stripeDetailsSubmitted: st.detailsSubmitted, stripePayoutsEnabled: st.payoutsEnabled, stripeRequirementsDue: st.requirementsDue },
    });
  }
  return NextResponse.json({ received: true });
}
