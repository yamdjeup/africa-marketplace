import type { Prisma, PrismaClient } from "@prisma/client";
import { returnStock } from "./stock";
import { registerTracking } from "./tracking-provider";

// Retours : le client demande, l'administrateur arbitre (accepter / refuser), puis le remboursement est enregistré.
export const RETURN_DAYS = 14;
export type ReturnStatus = "REQUESTED" | "ACCEPTED" | "RECEIVED" | "REFUSED" | "REFUNDED";

export const RETURN_LABELS: Record<ReturnStatus, { fr: string; en: string }> = {
  REQUESTED: { fr: "Retour demandé", en: "Return requested" },
  ACCEPTED: { fr: "Retour autorisé", en: "Return authorised" },
  RECEIVED: { fr: "Colis reçu", en: "Parcel received" },
  REFUSED: { fr: "Retour refusé", en: "Return refused" },
  REFUNDED: { fr: "Remboursé", en: "Refunded" },
};

/** Libellé du retour : « accepté » devient « Retour expédié » une fois l'expédition confirmée par le client. */
export function returnLabel(ret: { status: string; returnShippedAt?: Date | null }): { fr: string; en: string } {
  if (ret.status === "ACCEPTED" && ret.returnShippedAt) return { fr: "Retour expédié", en: "Return shipped" };
  return RETURN_LABELS[ret.status as ReturnStatus] ?? { fr: ret.status, en: ret.status };
}

export type Eligibility = "ok" | "not_delivered" | "expired" | "exists";

export function returnEligibility(sub: { status: string; deliveredAt: Date | null }, hasRequest: boolean, now = new Date()): Eligibility {
  if (sub.status !== "DELIVERED" || !sub.deliveredAt) return "not_delivered";
  if (hasRequest) return "exists";
  if (now.getTime() - sub.deliveredAt.getTime() > RETURN_DAYS * 86_400_000) return "expired";
  return "ok";
}

export type RequestResult = { ok: true; id: string } | { ok: false; error: Eligibility | "forbidden" | "reason" | "photos" | "photos_required" };

/** Demande de retour : propriétaire vérifié, colis livré, dans les 14 jours, une seule demande par colis. */
export async function requestReturn(db: PrismaClient, userId: string, subOrderId: string, reason: string, now = new Date(), photoIds: string[] = [], reasonId?: string | null): Promise<RequestResult> {
  let text = reason.trim().slice(0, 1000);
  const ids = [...new Set(photoIds)];
  let chosen: { id: string; fr: string; requiresPhotos: boolean } | null = null;
  if (reasonId) {
    chosen = await db.returnReason.findFirst({ where: { id: reasonId, active: true } });
    if (!chosen) return { ok: false, error: "reason" };
    text = text ? `${chosen.fr} — ${text}`.slice(0, 1000) : chosen.fr;
    if (chosen.requiresPhotos && ids.length === 0) return { ok: false, error: "photos_required" };
  }
  if (text.length < 3) return { ok: false, error: "reason" };
  if (ids.length > 5) return { ok: false, error: "photos" };
  const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { userId: true } } } });
  if (!sub || sub.order.userId !== userId) return { ok: false, error: "forbidden" };
  const existing = await db.returnRequest.count({ where: { subOrderId } });
  const eligibility = returnEligibility(sub, existing > 0, now);
  if (eligibility !== "ok") return { ok: false, error: eligibility };
  if (ids.length && (await db.mediaFile.count({ where: { id: { in: ids }, ownerUserId: userId, isPrivate: true } })) !== ids.length) return { ok: false, error: "photos" };
  const created = await db.returnRequest.create({ data: { subOrderId, userId, reason: text, reasonId: chosen?.id ?? null, photoIds: ids.join(",") } });
  return { ok: true, id: created.id };
}

/** Le client confirme l'expédition du retour (transporteur + numéro). Uniquement sur son retour accepté, une seule fois. */
export async function markReturnShipped(db: PrismaClient, userId: string, subOrderId: string, carrier: string, tracking: string, now = new Date()) {
  const c = carrier.trim().slice(0, 60);
  const t = tracking.replace(/[\s,;]+/g, "").slice(0, 60);
  if (c.length < 2 || t.length < 3) return "invalid" as const;
  const n = await db.returnRequest.updateMany({ where: { subOrderId, userId, status: "ACCEPTED", returnShippedAt: null }, data: { returnCarrier: c, returnTracking: t, returnShippedAt: now } });
  if (n.count === 1) await registerTracking(c, t);
  return n.count === 1 ? ("ok" as const) : ("state" as const);
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

/** Réception du colis retour (une seule logique : 17TRACK et bouton « J'ai reçu le colis »). Uniquement depuis « accepté » avec retour expédié ; idempotent. */
export async function receiveReturnParcel(db: PrismaClient, where: Prisma.ReturnRequestWhereInput, now = new Date()) {
  const ret = await db.returnRequest.findFirst({ where: { ...where, status: "ACCEPTED", returnShippedAt: { not: null } }, select: { id: true, subOrderId: true } });
  if (!ret) return null;
  const n = await db.returnRequest.updateMany({ where: { id: ret.id, status: "ACCEPTED" }, data: { status: "RECEIVED", partnerReceivedAt: now } });
  return n.count === 1 ? { id: ret.id, subOrderId: ret.subOrderId } : null;
}

/** Le créateur déclare avoir reçu le colis (suivi non remonté) : même transition que l'auto-réception 17TRACK, sur son propre colis. */
export async function partnerConfirmParcelArrived(db: PrismaClient, subOrderId: string, supplierId: string, now = new Date()) {
  return (await receiveReturnParcel(db, { subOrderId, subOrder: { supplierId } }, now)) ? ("ok" as const) : ("state" as const);
}

export type PartnerCondition = "OK" | "DAMAGED";

/** Le créateur confirme la réception du colis retour et son état ; « endommagé » exige un commentaire (≥3 car.). Uniquement depuis « accepté », sur son propre colis. */
export async function markReturnReceivedByPartner(db: PrismaClient, subOrderId: string, supplierId: string, condition: PartnerCondition, note: string, now = new Date()) {
  const text = note.trim();
  if (condition === "DAMAGED" && text.length < 3) return "note" as const;
  // « reçu » sans état (détecté par 17TRACK ou saisi par l'administration) reste à contrôler par le créateur.
  const open = { OR: [{ status: "ACCEPTED" }, { status: "RECEIVED", condition: null, partnerDecision: null }] };
  const ret = await db.returnRequest.findFirst({ where: { subOrderId, ...open, subOrder: { supplierId } }, select: { id: true, status: true, partnerReceivedAt: true } });
  if (!ret) return "state" as const;
  const n = await db.returnRequest.updateMany({ where: { id: ret.id, ...open }, data: { status: "RECEIVED", partnerReceivedAt: ret.partnerReceivedAt ?? now, condition, conditionNote: text || null } });
  if (n.count !== 1) return "state" as const;
  // « checked » : la réception était déjà enregistrée (17TRACK ou bouton), le client a déjà reçu le mail « reçu ».
  return ret.status === "RECEIVED" ? ("checked" as const) : ("ok" as const);
}

export type PartnerDecision = "ACCEPTED" | "REFUSED";

/** Après contrôle, le créateur accepte (remboursement visible par l'administration) ou refuse (motif ≥3 car., litige arbitrable). Une seule décision, uniquement depuis « reçu », sur son propre colis. */
export async function partnerDecideReturn(db: PrismaClient, subOrderId: string, supplierId: string, decision: PartnerDecision, note: string, now = new Date(), reasonId: string | null = null) {
  const text = note.trim().slice(0, 500);
  if (decision === "REFUSED" && !reasonId) return "note" as const;
  const ret = await db.returnRequest.findFirst({ where: { subOrderId, status: "RECEIVED", condition: { not: null }, partnerDecision: null, subOrder: { supplierId } }, select: { id: true } });
  if (!ret) return "state" as const;
  const n = await db.returnRequest.updateMany({ where: { id: ret.id, status: "RECEIVED", partnerDecision: null }, data: { partnerDecision: decision, partnerDecisionNote: text || null, partnerDecidedAt: now, partnerReasonId: decision === "REFUSED" ? reasonId : null } });
  return n.count === 1 ? ("ok" as const) : ("state" as const);
}

/** Date limite indicative de décision du créateur : 6 jours calendaires après réception. */
export function partnerCheckDeadline(receivedAt: Date) { return new Date(receivedAt.getTime() + PARTNER_CHECK_DAYS * 86400000); }

export function showShippedNotice(status: string, hasReturn: boolean) { return !hasReturn && ["SHIPPED", "DELIVERED"].includes(status); }
