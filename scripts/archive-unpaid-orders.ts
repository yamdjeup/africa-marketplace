// Archive les anciennes commandes jamais payées (créées avant le paiement) : elles restent en base mais sont masquées des listes.
// Usage : npx tsx scripts/archive-unpaid-orders.ts            (simulation, ne modifie rien)
//         npx tsx scripts/archive-unpaid-orders.ts --execute   (archive ; DATABASE_URL de la base visée)
// Ne touche jamais une commande payée (pi_…), remboursée, expédiée/livrée, ou avec écriture comptable.
import { PrismaClient } from "@prisma/client";
import { releaseStock } from "../src/lib/stock";

const EXPLICIT = ["AM-C83CA71A", "AM-C08665C5"];
const execute = process.argv.includes("--execute");
const db = new PrismaClient();

async function main() {
  const candidates = await db.order.findMany({
    where: {
      archivedAt: null,
      stripePaymentIntentId: null,
      OR: [{ stripeSessionId: { not: null } }, { paymentPending: true }, { number: { in: EXPLICIT } }],
    },
    include: { subOrders: true, items: true },
    orderBy: { createdAt: "asc" },
  });
  const ledger = await db.ledgerEntry.findMany({ where: { subOrderId: { in: candidates.flatMap((o) => o.subOrders.map((s) => s.id)) } }, select: { subOrderId: true } });
  const withLedger = new Set(ledger.map((l) => l.subOrderId));

  const safe = [];
  for (const o of candidates) {
    const reasons: string[] = [];
    for (const s of o.subOrders) {
      if (!["PENDING", "CANCELLED"].includes(s.status)) reasons.push(`colis ${s.number} au statut ${s.status}`);
      if (s.refundStatus === "DONE") reasons.push(`colis ${s.number} remboursé`);
      if (withLedger.has(s.id)) reasons.push(`colis ${s.number} avec écriture comptable`);
    }
    if (reasons.length) console.log(`IGNORÉE  ${o.number} : ${reasons.join(" ; ")}`);
    else safe.push(o);
  }
  for (const n of EXPLICIT) if (!candidates.some((o) => o.number === n)) console.log(`INFO     ${n} introuvable parmi les commandes non payées (déjà archivée, payée ou inexistante)`);

  console.log(`\n${execute ? "ARCHIVAGE" : "SIMULATION"} : ${safe.length} commande(s) jamais payée(s)\n`);
  for (const o of safe) console.log(`- ${o.number}  ${o.createdAt.toISOString().slice(0, 16)}  ${o.email}  ${(o.totalCents / 100).toFixed(2)} €  colis : ${o.subOrders.map((s) => s.status).join(",") || "aucun"}`);
  if (!execute) return console.log("\nAucune modification. Relancer avec --execute pour archiver.");

  for (const o of safe) {
    await db.$transaction(async (tx) => {
      // Un colis encore « À accepter » garde une réservation de stock : on la libère avant d'archiver.
      for (const s of o.subOrders.filter((x) => x.status === "PENDING")) {
        const n = await tx.subOrder.updateMany({ where: { id: s.id, status: "PENDING" }, data: { status: "CANCELLED", reason: "Paiement non finalisé (archivée)", decidedAt: new Date() } });
        if (n.count === 1) for (const it of o.items.filter((i) => i.subOrderId === s.id)) await releaseStock(tx, { slug: it.productSlug, label: it.size }, it.quantity, "Archivage commande non payée", { label: "script" }, s.number);
      }
      await tx.order.update({ where: { id: o.id }, data: { archivedAt: new Date(), paymentPending: false } });
    });
    console.log(`archivée ${o.number}`);
  }
}

main().finally(() => db.$disconnect());
