import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { balances } from "@/lib/ledger";
import { supplierFromRequest } from "@/lib/mobile-supplier";

export const dynamic = "force-dynamic";

// Mêmes données que /fournisseur/tableau-de-bord et /fournisseur/paiements, limitées au fournisseur du jeton.
export async function GET(req: Request) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const now = new Date();
  const [counts, bal, entries, payouts] = await Promise.all([
    db.subOrder.groupBy({ by: ["status"], where: { supplierId: sup.id, order: { archivedAt: null } }, _count: true }),
    balances(db, sup.id, now),
    db.ledgerEntry.findMany({ where: { supplierId: sup.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.payout.findMany({ where: { supplierId: sup.id }, orderBy: { paidAt: "desc" }, take: 20 }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const subs = await db.subOrder.findMany({ where: { id: { in: entries.map((e) => e.subOrderId) } }, select: { id: true, number: true } });
  const num = new Map(subs.map((s) => [s.id, s.number]));
  return NextResponse.json({
    name: sup.displayName,
    country: sup.country,
    craftType: sup.craftType,
    commissionPct: Math.round(sup.commissionRate * 1000) / 10,
    toAccept: n("PENDING"),
    toShip: n("ACCEPTED") + n("PREPARING"),
    inTransit: n("SHIPPED"),
    balance: { pending: bal.pending, available: bal.available, paid: bal.paid, gross: bal.gross, commission: bal.commission },
    sales: entries.map((e) => ({
      id: e.id,
      number: num.get(e.subOrderId) ?? e.subOrderId,
      grossCents: e.grossCents,
      commissionCents: e.commissionCents,
      netCents: e.netCents,
      state: e.reversedAt ? "reversed" : e.payoutId ? "paid" : e.availableAt <= now ? "available" : "pending",
      availableAt: e.availableAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({ id: p.id, paidAt: p.paidAt.toISOString(), reference: p.reference, amountCents: p.amountCents })),
  });
}
