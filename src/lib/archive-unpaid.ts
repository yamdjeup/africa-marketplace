import type { PrismaClient } from "@prisma/client";
import { releaseStock } from "./stock";

export const EXPLICIT_UNPAID = ["AM-C83CA71A", "AM-C08665C5"];

/** Archive (sans supprimer) les commandes jamais payées. Ignore payées, remboursées, expédiées/livrées et avec écriture comptable. */
export async function archiveUnpaidOrders(db: PrismaClient, execute: boolean) {
  const candidates = await db.order.findMany({
    where: { archivedAt: null, stripePaymentIntentId: null, OR: [{ stripeSessionId: { not: null } }, { paymentPending: true }, { number: { in: EXPLICIT_UNPAID } }] },
    include: { subOrders: true, items: true },
    orderBy: { createdAt: "asc" },
  });
  const ledger = await db.ledgerEntry.findMany({ where: { subOrderId: { in: candidates.flatMap((o) => o.subOrders.map((s) => s.id)) } }, select: { subOrderId: true } });
  const withLedger = new Set(ledger.map((l) => l.subOrderId));
  const safe = [];
  const proofs: object[] = [];
  const ignored: { number: string; reasons: string[] }[] = [];
  for (const o of candidates) {
    const reasons: string[] = [];
    if (o.stripePaymentIntentId) reasons.push("paiement Stripe enregistré (PaymentIntent)");
    for (const s of o.subOrders) {
      if (!["PENDING", "CANCELLED"].includes(s.status)) reasons.push(`colis ${s.number} au statut ${s.status}`);
      if (s.refundStatus === "DONE" || s.refundStatus === "FAILED" || s.refundId) reasons.push(`colis ${s.number} remboursement Stripe (${s.refundStatus || s.refundId})`);
      if (withLedger.has(s.id)) reasons.push(`colis ${s.number} avec écriture comptable`);
    }
    proofs.push({ number: o.number, neverPaid: reasons.length === 0, hasPaymentIntent: Boolean(o.stripePaymentIntentId), hasStripeSession: Boolean(o.stripeSessionId), paymentPending: o.paymentPending, refunds: o.subOrders.map((s) => s.refundStatus || s.refundId || "").filter(Boolean), ledgerEntries: o.subOrders.filter((s) => withLedger.has(s.id)).length, subStatuses: o.subOrders.map((s) => s.status), reasons });
    if (reasons.length) ignored.push({ number: o.number, reasons });
    else safe.push(o);
  }
  if (execute) {
    for (const o of safe) {
      await db.$transaction(async (tx) => {
        for (const s of o.subOrders.filter((x) => x.status === "PENDING")) {
          const n = await tx.subOrder.updateMany({ where: { id: s.id, status: "PENDING" }, data: { status: "CANCELLED", reason: "Paiement non finalisé (archivée)", decidedAt: new Date() } });
          if (n.count === 1) for (const it of o.items.filter((i) => i.subOrderId === s.id)) await releaseStock(tx, { slug: it.productSlug, label: it.size }, it.quantity, "Archivage commande non payée", { label: "script" }, s.number);
        }
        await tx.order.update({ where: { id: o.id }, data: { archivedAt: new Date(), paymentPending: false } });
      });
    }
  }
  return {
    mode: execute ? "execution" : "simulation",
    count: safe.length,
    orders: safe.map((o) => ({ number: o.number, createdAt: o.createdAt.toISOString(), email: o.email, totalEur: o.totalCents / 100, subStatuses: o.subOrders.map((s) => s.status) })),
    ignored,
    proofs,
    missingExplicit: EXPLICIT_UNPAID.filter((n) => !candidates.some((o) => o.number === n)),
  };
}
