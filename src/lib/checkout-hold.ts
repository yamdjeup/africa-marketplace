import type { PrismaClient } from "@prisma/client";
import { recordWatch } from "./restock-watch";
import { createSubOrders } from "./suborders";
import { releaseStock, reserveStock } from "./stock";
import { flushRestockSafe } from "./restock-flush";

// Réservation de stock de 30 min liée à une session Stripe Checkout : la commande (Order + colis) n'est créée qu'au paiement réussi.
// Sans dépendance serveur (ni next ni auth) : testable sur une base jetable.
export const HOLD_MINUTES = 30;

export class StockError extends Error {
  constructor(public item: string) {
    super(item);
  }
}

export type HoldLine = { slug: string; name: string; size: string | null; quantity: number; unitPriceCents: number; supplierId: string | null };
export type HoldPayload = {
  locale: string;
  email: string;
  userId: string | null;
  fullName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  street: string;
  houseNumber: string;
  box: string | null;
  complement: string | null;
  editToken: string;
  totalCents: number;
  lines: HoldLine[];
};

export const buyerKeyOf = (userId: string | null, email: string) => (userId ? `u:${userId}` : `e:${email.trim().toLowerCase()}`);

/** Quantités à réserver, regroupées par œuvre et variante. */
function aggregate(lines: HoldLine[]) {
  const m = new Map<string, { slug: string; label: string | null; qty: number; name: string }>();
  for (const l of lines) {
    const key = `${l.slug}\u0000${l.size ?? ""}`;
    const cur = m.get(key);
    m.set(key, { slug: l.slug, label: l.size, name: l.name, qty: (cur?.qty ?? 0) + l.quantity });
  }
  return [...m.values()];
}

async function reserveAll(tx: Parameters<typeof reserveStock>[0], payload: HoldPayload, number: string, paid = false) {
  for (const a of aggregate(payload.lines)) {
    const ok = await reserveStock(tx, { slug: a.slug, label: a.label }, a.qty, { id: payload.userId, label: payload.email }, number, paid ? undefined : `Réservation en attente de paiement (${number})`);
    if (!ok) throw new StockError(a.name);
  }
}

async function releaseLines(tx: Parameters<typeof releaseStock>[0], payload: HoldPayload, number: string, reason: string) {
  for (const a of aggregate(payload.lines)) await releaseStock(tx, { slug: a.slug, label: a.label }, a.qty, reason, { label: "système" }, number);
}

/** Libère une réservation (idempotent : seule la transition HELD → RELEASED libère le stock). */
export async function releaseHold(db: PrismaClient, number: string, reason = "Paiement non finalisé", watch = true) {
  const released = await db.$transaction(async (tx) => {
    const hold = await tx.checkoutHold.findUnique({ where: { number } });
    if (!hold) return false;
    const n = await tx.checkoutHold.updateMany({ where: { id: hold.id, status: "HELD" }, data: { status: "RELEASED" } });
    if (n.count !== 1) return false;
    await releaseLines(tx, hold.payload as unknown as HoldPayload, hold.number, reason);
    return hold;
  });
  if (!released) return false;
  if (watch) {
    const p = released.payload as unknown as HoldPayload;
    await recordWatch(db, { buyerKey: released.buyerKey, email: p.email, locale: p.locale, slugs: p.lines.map((l) => l.slug), source: "HOLD" });
    await flushRestockSafe();
  }
  return true;
}

/** Retour arrière puis reconfirmation : libère les réservations en cours du même acheteur. */
export async function releaseBuyerHolds(db: PrismaClient, buyerKey: string) {
  const holds = await db.checkoutHold.findMany({ where: { buyerKey, status: "HELD" }, select: { number: true } });
  let n = 0;
  for (const h of holds) if (await releaseHold(db, h.number, "Nouvelle confirmation du même acheteur", false)) n++;
  return n;
}

/** Balayage de secours : réservations de plus de 30 min (session Stripe abandonnée ou expirée). */
export async function releaseExpiredHolds(db: PrismaClient, now = new Date()) {
  const holds = await db.checkoutHold.findMany({ where: { status: "HELD", expiresAt: { lt: now } }, select: { number: true } });
  let n = 0;
  for (const h of holds) if (await releaseHold(db, h.number, "Réservation expirée (30 min)")) n++;
  return n;
}

/** Crée la réservation (stock vérifié et réservé atomiquement). Lève StockError nommant l'article. */
export async function createHold(db: PrismaClient, payload: HoldPayload, number: string, now = new Date()) {
  const key = buyerKeyOf(payload.userId, payload.email);
  await releaseBuyerHolds(db, key);
  return db.$transaction(async (tx) => {
    await reserveAll(tx, payload, number);
    return tx.checkoutHold.create({ data: { number, buyerKey: key, payload: payload as never, expiresAt: new Date(now.getTime() + HOLD_MINUTES * 60000) } });
  });
}

export async function attachSession(db: PrismaClient, number: string, stripeSessionId: string) {
  await db.checkoutHold.update({ where: { number }, data: { stripeSessionId } });
}

export type ConsumeResult = { status: "created"; orderId: string; subIds: string[] } | { status: "already" } | { status: "nostock"; item: string; payload: HoldPayload } | { status: "unknown" };

/**
 * Paiement réussi : crée la commande et les colis à partir de la réservation. Idempotent (une seule transition vers CONSUMED).
 * Si la réservation a été libérée entre-temps, le stock est réservé à nouveau ; s'il manque, aucune commande n'est créée (« nostock » : remboursement par l'appelant).
 */
export async function consumeHold(db: PrismaClient, number: string, paymentIntentId: string | null): Promise<ConsumeResult> {
  const hold = await db.checkoutHold.findUnique({ where: { number } });
  if (!hold) return { status: "unknown" };
  const payload = hold.payload as unknown as HoldPayload;
  if (hold.status === "CONSUMED" || hold.status === "REFUNDED") return { status: "already" };
  try {
    return await db.$transaction(async (tx) => {
      let wasReleased = false;
      const claimed = await tx.checkoutHold.updateMany({ where: { id: hold.id, status: "HELD" }, data: { status: "CONSUMED" } });
      if (claimed.count !== 1) {
        const again = await tx.checkoutHold.updateMany({ where: { id: hold.id, status: "RELEASED" }, data: { status: "CONSUMED" } });
        if (again.count !== 1) return { status: "already" } as const;
        wasReleased = true;
      }
      if (wasReleased) await reserveAll(tx, payload, number, true);
      const order = await tx.order.create({
        data: {
          number,
          locale: payload.locale,
          userId: payload.userId,
          email: payload.email,
          fullName: payload.fullName,
          address: payload.address,
          postalCode: payload.postalCode,
          city: payload.city,
          country: payload.country,
          phone: payload.phone,
          street: payload.street,
          houseNumber: payload.houseNumber,
          box: payload.box,
          complement: payload.complement,
          editToken: payload.editToken,
          stripePaymentIntentId: paymentIntentId,
          stripeSessionId: hold.stripeSessionId,
          paymentPending: false,
          totalCents: payload.totalCents,
          items: { create: payload.lines.map((l) => ({ productSlug: l.slug, name: l.name, size: l.size, quantity: l.quantity, unitPriceCents: l.unitPriceCents })) },
        },
      });
      const subs = await createSubOrders(tx, order, payload.lines.map((l) => ({ slug: l.slug, supplierId: l.supplierId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })));
      return { status: "created", orderId: order.id, subIds: subs.map((s) => s.id) } as const;
    });
  } catch (e) {
    if (e instanceof StockError) {
      await db.checkoutHold.updateMany({ where: { id: hold.id }, data: { status: "REFUNDED" } });
      return { status: "nostock", item: e.item, payload };
    }
    throw e;
  }
}
