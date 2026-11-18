import type { PrismaClient } from "@prisma/client";
import { returnStock } from "./stock";

// Retours : le client demande, l'administrateur arbitre (accepter / refuser), puis le remboursement est enregistré.
export const RETURN_DAYS = 30;
export type ReturnStatus = "REQUESTED" | "ACCEPTED" | "RECEIVED" | "REFUSED" | "REFUNDED";

export const RETURN_LABELS: Record<ReturnStatus, { fr: string; en: string }> = {
  REQUESTED: { fr: "Retour demandé", en: "Return requested" },
  ACCEPTED: { fr: "Retour accepté", en: "Return accepted" },
  RECEIVED: { fr: "Colis reçu", en: "Parcel received" },
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

export type RequestResult = { ok: true; id: string } | { ok: false; error: Eligibility | "forbidden" | "reason" | "photos" };

/** Demande de retour : propriétaire vérifié, colis livré, dans les 30 jours, une seule demande par colis. */
export async function requestReturn(db: PrismaClient, userId: string, subOrderId: string, reason: string, now = new Date(), photoIds: string[] = []): Promise<RequestResult> {
  const text = reason.trim().slice(0, 1000);
  if (text.length < 3) return { ok: false, error: "reason" };
  const ids = [...new Set(photoIds)];
  if (ids.length > 5) return { ok: false, error: "photos" };
  const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { userId: true } } } });
  if (!sub || sub.order.userId !== userId) return { ok: false, error: "forbidden" };
  const existing = await db.returnRequest.count({ where: { subOrderId } });
  const eligibility = returnEligibility(sub, existing > 0, now);
  if (eligibility !== "ok") return { ok: false, error: eligibility };
  if (ids.length && (await db.mediaFile.count({ where: { id: { in: ids }, ownerUserId: userId, isPrivate: true } })) !== ids.length) return { ok: false, error: "photos" };
  const created = await db.returnRequest.create({ data: { subOrderId, userId, reason: text, photoIds: ids.join(",") } });
  return { ok: true, id: created.id };
}

/** Décision de l'administrateur (anti-course : uniquement depuis « demandé »). */
export async function decideReturn(db: PrismaClient, id: string, decision: "ACCEPTED" | "REFUSED", note: string, now = new Date()) {
  const n = await db.returnRequest.updateMany({ where: { id, status: "REQUESTED" }, data: { status: decision, adminNote: note.trim().slice(0, 1000), decidedAt: now } });
  return n.count === 1 ? db.returnRequest.findUnique({ where: { id } }) : null;
}

type RefundFn = (o: { paymentIntentId: string | null; amountCents: number; subOrderId: string }) => Promise<{ status: string; refundId?: string; note?: string }>;

/** Rembourse un retour accepté. Échec ou absence de paiement Stripe : reste « accepté » avec une note (à reprendre par l'administrateur). */
/** Sort du colis remboursé : remise en vente (stock +1 par unité) ou exclusion du stock (motif obligatoire, aucun changement de stock). */
export type StockChoice = boolean | { exclude: string };

export function parseStockChoice(f: FormData): StockChoice | null {
  const v = String(f.get("stock") ?? "");
  if (v === "restock") return true;
  if (v !== "exclude") return null;
  const comment = String(f.get("excludeReason") ?? "").trim().slice(0, 300);
  return comment ? { exclude: comment } : null;
}

export async function refundReturn(db: PrismaClient, id: string, refund: RefundFn, now = new Date(), restock: StockChoice = false) {
  if (typeof restock === "object" && !restock.exclude.trim()) return null;
  const ret = await db.returnRequest.findUnique({ where: { id }, include: { subOrder: { include: { order: { select: { stripePaymentIntentId: true, number: true } } } } } });
  if (!ret || (ret.status !== "ACCEPTED" && ret.status !== "RECEIVED")) return null;
  const r = await refund({ paymentIntentId: ret.subOrder.order.stripePaymentIntentId, amountCents: ret.subOrder.subtotalCents, subOrderId: ret.subOrderId });
  if (r.status !== "DONE") {
    const note = r.status === "MANUAL" ? "Aucun paiement Stripe enregistré : remboursement à faire manuellement." : r.note ?? "échec";
    await db.returnRequest.update({ where: { id }, data: { refundNote: note } });
    return { done: false as const, note };
  }
  const claimed = await db.returnRequest.updateMany({ where: { id, status: { in: ["ACCEPTED", "RECEIVED"] } }, data: { status: "REFUNDED", refundId: r.refundId ?? null, refundNote: null, refundedAt: now } });
  if (claimed.count === 1) {
    if (typeof restock === "object") {
      const items = await db.orderItem.findMany({ where: { subOrderId: ret.subOrderId } });
      for (const it of items) await db.stockMovement.create({ data: { productSlug: it.productSlug, variantId: null, type: "ADJUST", quantity: 0, reason: `Retour remboursé, exclu du stock : ${ret.subOrder.number} — ${restock.exclude.trim()}`, authorId: null, authorLabel: "administration", orderNumber: ret.subOrder.order.number } });
    } else if (restock) {
      const items = await db.orderItem.findMany({ where: { subOrderId: ret.subOrderId } });
      for (const it of items) await returnStock(db, { slug: it.productSlug, label: it.size }, it.quantity, `Retour remboursé : ${ret.subOrder.number}`, { label: "administration" }, ret.subOrder.order.number);
    }
    await db.subOrder.update({ where: { id: ret.subOrderId }, data: { refundStatus: "DONE", refundId: r.refundId ?? null } });
    await db.ledgerEntry.updateMany({ where: { subOrderId: ret.subOrderId, payoutId: null, reversedAt: null }, data: { reversedAt: now } });
  }
  return { done: true as const, refundId: r.refundId };
}

/** Marque comme remboursé un retour traité hors Stripe (virement manuel). */
export async function markReturnRefundedManually(db: PrismaClient, id: string, now = new Date(), restock: StockChoice = false) {
  const ret = await db.returnRequest.findUnique({ where: { id } });
  if (!ret || (ret.status !== "ACCEPTED" && ret.status !== "RECEIVED")) return null;
  return refundReturn(db, id, async () => ({ status: "DONE", refundId: "manuel" }), now, restock);
}

/** Colis retour reçu par l'administration (anti-course : uniquement depuis « accepté »). */
export async function markReturnReceived(db: PrismaClient, id: string) {
  const n = await db.returnRequest.updateMany({ where: { id, status: "ACCEPTED" }, data: { status: "RECEIVED" } });
  return n.count === 1;
}

export const PARTNER_CHECK_DAYS = 6;

export type PartnerCondition = "OK" | "DAMAGED";

/** Le créateur confirme la réception du colis retour et son état ; « endommagé » exige un commentaire (≥3 car.). Uniquement depuis « accepté », sur son propre colis. */
export async function markReturnReceivedByPartner(db: PrismaClient, subOrderId: string, supplierId: string, condition: PartnerCondition, note: string, now = new Date()) {
  const text = note.trim();
  if (condition === "DAMAGED" && text.length < 3) return "note" as const;
  const ret = await db.returnRequest.findFirst({ where: { subOrderId, status: "ACCEPTED", subOrder: { supplierId } }, select: { id: true } });
  if (!ret) return "state" as const;
  const n = await db.returnRequest.updateMany({ where: { id: ret.id, status: "ACCEPTED" }, data: { status: "RECEIVED", partnerReceivedAt: now, condition, conditionNote: text || null } });
  return n.count === 1 ? ("ok" as const) : ("state" as const);
}

export type PartnerDecision = "ACCEPTED" | "REFUSED";

/** Après contrôle, le créateur accepte (remboursement visible par l'administration) ou refuse (motif ≥3 car., litige arbitrable). Une seule décision, uniquement depuis « reçu », sur son propre colis. */
export async function partnerDecideReturn(db: PrismaClient, subOrderId: string, supplierId: string, decision: PartnerDecision, note: string, now = new Date(), reasonId: string | null = null) {
  const text = note.trim().slice(0, 500);
  if (decision === "REFUSED" && !reasonId) return "note" as const;
  const ret = await db.returnRequest.findFirst({ where: { subOrderId, status: "RECEIVED", partnerDecision: null, subOrder: { supplierId } }, select: { id: true } });
  if (!ret) return "state" as const;
  const n = await db.returnRequest.updateMany({ where: { id: ret.id, status: "RECEIVED", partnerDecision: null }, data: { partnerDecision: decision, partnerDecisionNote: text || null, partnerDecidedAt: now, partnerReasonId: decision === "REFUSED" ? reasonId : null } });
  return n.count === 1 ? ("ok" as const) : ("state" as const);
}

/** Date limite indicative de décision du créateur : 6 jours calendaires après réception. */
export function partnerCheckDeadline(receivedAt: Date) { return new Date(receivedAt.getTime() + PARTNER_CHECK_DAYS * 86400000); }

export function showShippedNotice(status: string, hasReturn: boolean) { return !hasReturn && ["SHIPPED", "DELIVERED"].includes(status); }
