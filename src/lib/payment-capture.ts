import type { PrismaClient } from "@prisma/client";

const CLOSED = ["REFUSED", "EXPIRED", "CANCELLED"];

/** Relances au créateur (heures après la commande) quand l'encaissement est à la confirmation ; expiration à 24 h. */
export const CREATOR_REMINDER_HOURS = [2, 12, 20];

/**
 * Règle le paiement autorisé d'une commande quand plus aucun colis n'attend le créateur :
 * encaissement du montant des colis confirmés (le reste de l'autorisation est levé) ou annulation de l'autorisation si tout est refusé/expiré.
 * Une autorisation Stripe ne se capture qu'une fois : avec plusieurs créateurs, l'encaissement attend la dernière décision.
 */
export async function settleOrderPayment(db: PrismaClient, orderId: string, f: typeof fetch = fetch): Promise<"waiting" | "skip" | "captured" | "cancelled" | "failed"> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { subOrders: true } });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!order || order.captureStatus !== "AUTHORIZED" || !order.stripePaymentIntentId || !key) return "skip";
  if (order.subOrders.some((s) => s.status === "PENDING")) return "waiting";
  const claim = await db.order.updateMany({ where: { id: orderId, captureStatus: "AUTHORIZED" }, data: { captureStatus: "PROCESSING" } });
  if (claim.count !== 1) return "skip";
  const kept = order.subOrders.filter((s) => !CLOSED.includes(s.status));
  const refused = order.subOrders.filter((s) => CLOSED.includes(s.status)).reduce((n, s) => n + s.subtotalCents, 0);
  const pi = encodeURIComponent(order.stripePaymentIntentId);
  const capture = kept.length > 0;
  const body = capture ? new URLSearchParams({ amount_to_capture: String(order.totalCents - refused) }) : new URLSearchParams();
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `${capture ? "capture" : "cancel"}-${order.number}` };
  try {
    const res = await f(`https://api.stripe.com/v1/payment_intents/${pi}/${capture ? "capture" : "cancel"}`, { method: "POST", headers, body });
    if (res.ok) {
      await db.order.update({ where: { id: orderId }, data: { captureStatus: capture ? "CAPTURED" : "CANCELLED" } });
      if (capture) for (const s of kept) await db.subOrder.update({ where: { id: s.id }, data: { capturedCents: s.subtotalCents } });
      return capture ? "captured" : "cancelled";
    }
    console.error(`[capture] Stripe a refusé ${capture ? "l'encaissement" : "l'annulation"} de la commande ${order.number} (HTTP ${res.status})`);
  } catch {
    console.error(`[capture] Échec réseau pour la commande ${order.number}`);
  }
  await db.order.update({ where: { id: orderId }, data: { captureStatus: "FAILED" } });
  return "failed";
}
