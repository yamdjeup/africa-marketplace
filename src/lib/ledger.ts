import type { PrismaClient } from "@prisma/client";
import type { Db } from "./stock";

const DAY = 86_400_000;
/** Délai avant qu'un gain devienne disponible (fenêtre de retour). LEDGER_HOLD_DAYS, défaut 7. */
export const holdDays = () => {
  const n = Number(process.env.LEDGER_HOLD_DAYS ?? "7");
  return Number.isFinite(n) && n >= 0 ? n : 7;
};

/** Écrit l'entrée de registre d'une sous-commande livrée (idempotent). Mode test : aucun argent réel. */
export async function recordDelivery(db: Db, sub: { id: string; supplierId: string; subtotalCents: number }, now = new Date()) {
  const supplier = await db.supplier.findUnique({ where: { id: sub.supplierId }, select: { commissionRate: true } });
  const rate = supplier?.commissionRate ?? 0.15;
  const commissionCents = Math.round(sub.subtotalCents * rate);
  const data = {
    supplierId: sub.supplierId,
    subOrderId: sub.id,
    grossCents: sub.subtotalCents,
    commissionRate: rate,
    commissionCents,
    netCents: sub.subtotalCents - commissionCents,
    availableAt: new Date(now.getTime() + holdDays() * DAY),
  };
  return db.ledgerEntry.upsert({ where: { subOrderId: sub.id }, create: data, update: {} });
}

export async function balances(db: PrismaClient, supplierId: string, now = new Date()) {
  const rows = await db.ledgerEntry.findMany({ where: { supplierId, reversedAt: null }, select: { netCents: true, commissionCents: true, grossCents: true, availableAt: true, payoutId: true } });
  const out = { pending: 0, available: 0, paid: 0, gross: 0, commission: 0 };
  for (const r of rows) {
    out.gross += r.grossCents;
    out.commission += r.commissionCents;
    if (r.payoutId) out.paid += r.netCents;
    else if (r.availableAt <= now) out.available += r.netCents;
    else out.pending += r.netCents;
  }
  return out;
}

/** Marque comme versées toutes les entrées disponibles d'un partenaire (atomique, sans double versement). */
export async function createPayout(db: PrismaClient, supplierId: string, paidBy: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const rows = await tx.ledgerEntry.findMany({ where: { supplierId, payoutId: null, reversedAt: null, availableAt: { lte: now } } });
    if (rows.length === 0) return null;
    const amount = rows.reduce((n, r) => n + r.netCents, 0);
    const payout = await tx.payout.create({ data: { supplierId, amountCents: amount, entryCount: rows.length, reference: `TEST-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, paidBy } });
    const n = await tx.ledgerEntry.updateMany({ where: { id: { in: rows.map((r) => r.id) }, payoutId: null }, data: { payoutId: payout.id } });
    if (n.count !== rows.length) throw new Error("payout-concurrent");
    return payout;
  });
}
