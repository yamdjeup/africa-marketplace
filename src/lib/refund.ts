import "server-only";
import { db } from "@/lib/db";

export type RefundResult = { status: "DONE" | "FAILED" | "MANUAL"; refundId?: string; note?: string };

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
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (res.ok && json.id) return { status: "DONE", refundId: json.id };
    console.error(`[refund] Stripe a refusé le remboursement du colis ${opts.subOrderId} (HTTP ${res.status}) : ${json.error?.message ?? "sans détail"}`);
    return { status: "FAILED", note: json.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    console.error(`[refund] Échec réseau pour le colis ${opts.subOrderId}`, e);
    return { status: "FAILED", note: "erreur réseau" };
  }
}

/**
 * Rembourse un colis fermé (annulé, refusé, expiré) si le paiement est confirmé et l'enregistre sur le colis.
 * Si le paiement n'est pas encore confirmé, le colis reste « AWAITING » : le webhook relance ce remboursement.
 */
export async function settleSubRefund(subOrderId: string) {
  const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { stripePaymentIntentId: true, paymentPending: true } } } });
  if (!sub || !["CANCELLED", "REFUSED", "EXPIRED"].includes(sub.status) || ["DONE"].includes(sub.refundStatus)) return;
  if (sub.order.paymentPending && !sub.order.stripePaymentIntentId) {
    await db.subOrder.update({ where: { id: subOrderId }, data: { refundStatus: "AWAITING", refundNote: "Paiement non confirmé : remboursement à faire dès confirmation." } });
    return;
  }
  const r = await refundSubOrder({ paymentIntentId: sub.order.stripePaymentIntentId, amountCents: sub.subtotalCents, subOrderId });
  await db.subOrder.update({ where: { id: subOrderId }, data: { refundStatus: r.status, refundId: r.refundId ?? null, refundNote: r.note ?? null } });
}

/** Remboursement intégral d'un paiement (commande non créée faute de stock). Idempotent par numéro de commande. */
export async function refundPayment(opts: { paymentIntentId: string | null; amountCents: number; number: string }): Promise<RefundResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !opts.paymentIntentId || opts.amountCents <= 0) return { status: "MANUAL" };
  try {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `refund-hold-${opts.number}` },
      body: new URLSearchParams({ payment_intent: opts.paymentIntentId, amount: String(opts.amountCents), "metadata[orderNumber]": opts.number, "metadata[reason]": "stock_unavailable" }),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (res.ok && json.id) return { status: "DONE", refundId: json.id };
    console.error(`[refund] Remboursement refusé pour ${opts.number} (HTTP ${res.status}) : ${json.error?.message ?? "sans détail"}`);
    return { status: "FAILED", note: json.error?.message ?? `HTTP ${res.status}` };
  } catch {
    console.error(`[refund] Échec réseau pour ${opts.number}`);
    return { status: "FAILED", note: "erreur réseau" };
  }
}