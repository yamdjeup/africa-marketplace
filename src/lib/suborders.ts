import type { Prisma, PrismaClient } from "@prisma/client";
import { recordDelivery } from "./ledger";
import { confirmSale, releaseStock, type Actor, type Db } from "./stock";

// Sous-commandes par partenaire : le vendeur est la boutique (partenaire), E póm ta' est l'intermédiaire.
// Sans dépendance serveur : utilisable depuis les scripts de vérification. Les e-mails sont envoyés par les appelants.
export const ACCEPT_HOURS = 48;
export const REMIND_AFTER_HOURS = 24;
export const ESCALATE_AFTER_HOURS = 36;
const HOUR = 3_600_000;

export type SubStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "REFUSED" | "EXPIRED" | "CANCELLED";

export const SUB_LABELS: Record<SubStatus, { fr: string; en: string; cls: string }> = {
  PENDING: { fr: "À accepter", en: "To accept", cls: "bg-amber-100 text-amber-900" },
  ACCEPTED: { fr: "Acceptée", en: "Accepted", cls: "bg-sky-100 text-sky-900" },
  PREPARING: { fr: "En préparation", en: "Preparing", cls: "bg-sky-100 text-sky-900" },
  SHIPPED: { fr: "Expédiée", en: "Shipped", cls: "bg-emerald-100 text-emerald-900" },
  DELIVERED: { fr: "Livrée", en: "Delivered", cls: "bg-emerald-100 text-emerald-900" },
  REFUSED: { fr: "Refusée par la boutique", en: "Declined by the shop", cls: "bg-red-100 text-red-900" },
  EXPIRED: { fr: "Expirée (sans réponse sous 48 h)", en: "Expired (no reply within 48 h)", cls: "bg-red-100 text-red-900" },
  CANCELLED: { fr: "Annulée", en: "Cancelled", cls: "bg-red-100 text-red-900" },
};

export const subLabel = (status: string) => SUB_LABELS[status as SubStatus] ?? SUB_LABELS.PENDING;
export const isOpenStatus = (s: string) => ["PENDING", "ACCEPTED", "PREPARING", "SHIPPED"].includes(s);

type Line = { slug: string; supplierId: string | null; quantity: number; unitPriceCents: number };

/** Une sous-commande par partenaire ; les œuvres sans partenaire (catalogue historique) restent hors sous-commande. */
export async function createSubOrders(db: Db, order: { id: string; number: string }, lines: Line[], now = new Date()) {
  const groups = new Map<string, Line[]>();
  for (const l of lines) if (l.supplierId) groups.set(l.supplierId, [...(groups.get(l.supplierId) ?? []), l]);
  const created = [];
  let i = 1;
  for (const [supplierId, ls] of groups) {
    const sub = await db.subOrder.create({
      data: {
        orderId: order.id,
        supplierId,
        number: `${order.number}-${i++}`,
        subtotalCents: ls.reduce((n, l) => n + l.quantity * l.unitPriceCents, 0),
        acceptBy: new Date(now.getTime() + ACCEPT_HOURS * HOUR),
      },
    });
    await db.orderItem.updateMany({ where: { orderId: order.id, productSlug: { in: ls.map((l) => l.slug) } }, data: { subOrderId: sub.id } });
    created.push(sub);
  }
  return created;
}

async function loadItems(db: Db, subOrderId: string) {
  return db.orderItem.findMany({ where: { subOrderId } });
}

const guard = (id: string, supplierId: string | null, from: SubStatus[]) => ({ id, status: { in: from }, ...(supplierId ? { supplierId } : {}) });

/** Annule une sous-commande et libère le stock réservé (refus, expiration, annulation). */
async function closeAndRelease(db: PrismaClient, id: string, supplierId: string | null, from: SubStatus[], to: "REFUSED" | "EXPIRED" | "CANCELLED", reason: string, actor: Actor) {
  return db.$transaction(async (tx) => {
    const n = await tx.subOrder.updateMany({ where: guard(id, supplierId, from), data: { status: to, reason, decidedAt: new Date() } });
    if (n.count !== 1) return null;
    const sub = await tx.subOrder.findUniqueOrThrow({ where: { id } });
    for (const it of await loadItems(tx, id)) await releaseStock(tx, { slug: it.productSlug, label: it.size }, it.quantity, reason || to, actor, sub.number);
    return sub;
  });
}

export async function acceptSub(db: PrismaClient, id: string, supplierId: string | null) {
  const n = await db.subOrder.updateMany({ where: { ...guard(id, supplierId, ["PENDING"]), acceptBy: { gt: new Date() } }, data: { status: "ACCEPTED", decidedAt: new Date() } });
  return n.count === 1 ? db.subOrder.findUnique({ where: { id } }) : null;
}

export const refuseSub = (db: PrismaClient, id: string, supplierId: string | null, reason: string, actor: Actor) => closeAndRelease(db, id, supplierId, ["PENDING"], "REFUSED", reason, actor);
export const cancelSub = (db: PrismaClient, id: string, reason: string, actor: Actor) => closeAndRelease(db, id, null, ["PENDING", "ACCEPTED", "PREPARING"], "CANCELLED", reason, actor);

export async function prepareSub(db: PrismaClient, id: string, supplierId: string | null) {
  const n = await db.subOrder.updateMany({ where: guard(id, supplierId, ["ACCEPTED"]), data: { status: "PREPARING" } });
  return n.count === 1;
}

/** Expédition : le stock réservé devient une sortie définitive. */
export async function shipSub(db: PrismaClient, id: string, supplierId: string | null, carrier: string, trackingNumber: string, actor: Actor) {
  return db.$transaction(async (tx) => {
    const n = await tx.subOrder.updateMany({ where: guard(id, supplierId, ["ACCEPTED", "PREPARING"]), data: { status: "SHIPPED", carrier, trackingNumber, shippedAt: new Date() } });
    if (n.count !== 1) return null;
    const sub = await tx.subOrder.findUniqueOrThrow({ where: { id } });
    for (const it of await loadItems(tx, id)) {
      const ok = await confirmSale(tx, { slug: it.productSlug, label: it.size }, it.quantity, actor, sub.number);
      if (!ok) throw new Error("stock-confirm");
    }
    return sub;
  });
}

export async function deliverSub(db: PrismaClient, id: string, supplierId: string | null) {
  return db.$transaction(async (tx) => {
    const n = await tx.subOrder.updateMany({ where: guard(id, supplierId, ["SHIPPED"]), data: { status: "DELIVERED", deliveredAt: new Date() } });
    if (n.count !== 1) return null;
    const sub = await tx.subOrder.findUniqueOrThrow({ where: { id } });
    await recordDelivery(tx, sub);
    return sub;
  });
}

/** Relance à 24 h, escalade admin à 36 h, expiration (stock libéré) à 48 h. Idempotent. */
export async function sweepSubOrders(db: PrismaClient, now = new Date()) {
  const pending = await db.subOrder.findMany({ where: { status: "PENDING" } });
  const out = { reminded: [] as typeof pending, escalated: [] as typeof pending, expired: [] as typeof pending };
  for (const s of pending) {
    const age = now.getTime() - (s.acceptBy.getTime() - ACCEPT_HOURS * HOUR);
    if (age >= ACCEPT_HOURS * HOUR) {
      const closed = await closeAndRelease(db, s.id, null, ["PENDING"], "EXPIRED", "Sans réponse du partenaire sous 48 h", { label: "système" });
      if (closed) out.expired.push(closed);
      continue;
    }
    if (age >= ESCALATE_AFTER_HOURS * HOUR && !s.escalatedAt) {
      const n = await db.subOrder.updateMany({ where: { id: s.id, escalatedAt: null, status: "PENDING" }, data: { escalatedAt: now } });
      if (n.count === 1) out.escalated.push(s);
    }
    if (age >= REMIND_AFTER_HOURS * HOUR && !s.reminderSentAt) {
      const n = await db.subOrder.updateMany({ where: { id: s.id, reminderSentAt: null, status: "PENDING" }, data: { reminderSentAt: now } });
      if (n.count === 1) out.reminded.push(s);
    }
  }
  return out;
}

/** Libère les réservations de commandes jamais payées (retour arrière Stripe, abandon) : celles du même e-mail, ou de plus de `olderThanMin` minutes. Idempotent. */
export async function releaseUnpaidOrders(db: PrismaClient, opts: { email?: string; olderThanMin?: number; now?: Date }) {
  const now = opts.now ?? new Date();
  const or: Prisma.OrderWhereInput[] = [];
  if (opts.email) or.push({ email: opts.email }, { email: opts.email.toLowerCase() });
  if (opts.olderThanMin !== undefined) or.push({ createdAt: { lt: new Date(now.getTime() - opts.olderThanMin * 60000) } });
  if (or.length === 0) return 0;
  const orders = await db.order.findMany({ where: { paymentPending: true, stripePaymentIntentId: null, OR: or }, select: { id: true, subOrders: { where: { status: "PENDING" }, select: { id: true } } } });
  let n = 0;
  for (const o of orders) {
    for (const s of o.subOrders) if (await closeAndRelease(db, s.id, null, ["PENDING"], "CANCELLED", "Paiement non finalisé", { label: "système" })) n++;
    await db.order.update({ where: { id: o.id }, data: { paymentPending: false } });
  }
  return n;
}

export type SubOrderWithItems = Prisma.SubOrderGetPayload<object>;
