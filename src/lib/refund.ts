import "server-only";

export type RefundResult = { status: "DONE" | "FAILED" | "MANUAL"; refundId?: string };

/** Remboursement Stripe du montant d'un colis annulé (idempotent par colis). Sans clé ou sans paiement Stripe : MANUAL. */
export async function refundSubOrder(opts: { paymentIntentId: string | null; amountCents: number; subOrderId: string }): Promise<RefundResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !opts.paymentIntentId || opts.amountCents <= 0) return { status: "MANUAL" };
  try {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `refund-${opts.subOrderId}`,
      },
      body: new URLSearchParams({ payment_intent: opts.paymentIntentId, amount: String(opts.amountCents), "metadata[subOrderId]": opts.subOrderId }),
    });
    const json = (await res.json()) as { id?: string };
    return res.ok && json.id ? { status: "DONE", refundId: json.id } : { status: "FAILED" };
  } catch {
    return { status: "FAILED" };
  }
}
