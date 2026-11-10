import type { PrismaClient } from "@prisma/client";

// Retours : le client demande, l'administrateur arbitre (accepter / refuser), puis le remboursement est enregistré.
export const RETURN_DAYS = 30;
export type ReturnStatus = "REQUESTED" | "ACCEPTED" | "REFUSED" | "REFUNDED";

export const RETURN_LABELS: Record<ReturnStatus, { fr: string; en: string }> = {
  REQUESTED: { fr: "Retour demandé", en: "Return requested" },
  ACCEPTED: { fr: "Retour accepté", en: "Return accepted" },
  REFUSED: { fr: "Retour refusé", en: "Return refused" },
  REFUNDED: { fr: "Remboursé", en: "Refunded" },
};

export type Eligibility = "ok" | "not_delivered" | "expired" | "exists";

export function returnEligibility(sub: { status: string; deliveredAt: Date | null }, hasRequest: boolean, now = new Date()): Eligibility {
  if (sub.status !== "DELIVERED" || !sub.deliveredAt) return "not_delivered";
  if (hasRequest) return "exists";
  if (now.getTime() - sub.deliveredAt.getTime() > RETURN_DAYS * 86_400_000) return "expired";
  return "ok";
}

export type RequestResult = { ok: true; id: string } | { ok: false; error: Eligibility | "forbidden" | "reason" };

/** Demande de retour : propriétaire vérifié, colis livré, dans les 30 jours, une seule demande par colis. */
export async function requestReturn(db: PrismaClient, userId: string, subOrderId: string, reason: string, now = new Date()): Promise<RequestResult> {
  const text = reason.trim().slice(0, 1000);
  if (text.length < 3) return { ok: false, error: "reason" };
  const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { userId: true } } } });
  if (!sub || sub.order.userId !== userId) return { ok: false, error: "forbidden" };
  const existing = await db.returnRequest.count({ where: { subOrderId } });
  const eligibility = returnEligibility(sub, existing > 0, now);
  if (eligibility !== "ok") return { ok: false, error: eligibility };
  const created = await db.returnRequest.create({ data: { subOrderId, userId, reason: text } });
  return { ok: true, id: created.id };
}

/** Décision de l'administrateur (anti-course : uniquement depuis « demandé »). */
export async function decideReturn(db: PrismaClient, id: string, decision: "ACCEPTED" | "REFUSED", note: string, now = new Date()) {
  const n = await db.returnRequest.updateMany({ where: { id, status: "REQUESTED" }, data: { status: decision, adminNote: note.trim().slice(0, 1000), decidedAt: now } });
  return n.count === 1 ? db.returnRequest.findUnique({ where: { id } }) : null;
}

type RefundFn = (o: { paymentIntentId: string | null; amountCents: number; subOrderId: string }) => Promise<{ status: string; refundId?: string; note?: string }>;

/** Rembourse un retour accepté. Échec ou absence de paiement Stripe : reste « accepté » avec une note (à reprendre par l'administrateur). */
export async function refundReturn(db: PrismaClient, id: string, refund: RefundFn, now = new Date()) {
  const ret = await db.returnRequest.findUnique({ where: { id }, include: { subOrder: { include: { order: { select: { stripePaymentIntentId: true } } } } } });
  if (!ret || ret.status !== "ACCEPTED") return null;
  const r = await refund({ paymentIntentId: ret.subOrder.order.stripePaymentIntentId, amountCents: ret.subOrder.subtotalCents, subOrderId: ret.subOrderId });
  if (r.status !== "DONE") {
    const note = r.status === "MANUAL" ? "Aucun paiement Stripe enregistré : remboursement à faire manuellement." : r.note ?? "échec";
    await db.returnRequest.update({ where: { id }, data: { refundNote: note } });
    return { done: false as const, note };
  }
  const claimed = await db.returnRequest.updateMany({ where: { id, status: "ACCEPTED" }, data: { status: "REFUNDED", refundId: r.refundId ?? null, refundNote: null, refundedAt: now } });
  if (claimed.count === 1) {
    await db.subOrder.update({ where: { id: ret.subOrderId }, data: { refundStatus: "DONE", refundId: r.refundId ?? null } });
    await db.ledgerEntry.updateMany({ where: { subOrderId: ret.subOrderId, payoutId: null, reversedAt: null }, data: { reversedAt: now } });
  }
  return { done: true as const, refundId: r.refundId };
}

/** Marque comme remboursé un retour traité hors Stripe (virement manuel). */
export async function markReturnRefundedManually(db: PrismaClient, id: string, now = new Date()) {
  const ret = await db.returnRequest.findUnique({ where: { id } });
  if (!ret || ret.status !== "ACCEPTED") return null;
  return refundReturn(db, id, async () => ({ status: "DONE", refundId: "manuel" }), now);
}
