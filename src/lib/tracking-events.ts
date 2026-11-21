import type { PrismaClient } from "@prisma/client";
import { deliverSub } from "@/lib/suborders";
import { receiveReturnParcel } from "@/lib/returns";
import { carrierCodeFor, type TrackingProvider, type TrackingUpdate } from "@/lib/tracking-provider";

export type TrackingOutcome = "delivered" | "return-received" | "ignored";

/** Applique une mise à jour de suivi : livraison du colis ou réception du retour, uniquement sur statut « Delivered ». Idempotent (gardes d'état). */
export async function applyTrackingUpdate(db: PrismaClient, u: TrackingUpdate, now = new Date()): Promise<{ outcome: TrackingOutcome; subOrderId?: string }> {
  if (!u.delivered) return { outcome: "ignored" };
  const sub = await db.subOrder.findFirst({ where: { trackingNumber: u.number, status: "SHIPPED" }, select: { id: true } });
  if (sub) {
    const done = await deliverSub(db, sub.id, null);
    return done ? { outcome: "delivered", subOrderId: sub.id } : { outcome: "ignored" };
  }
  const ret = await receiveReturnParcel(db, { returnTracking: u.number }, now);
  if (ret) return { outcome: "return-received", subOrderId: ret.subOrderId };
  return { outcome: "ignored" };
}

const BATCH = 40;

/** Rattrapage si le webhook est manqué : relit le suivi des colis expédiés non livrés et des retours expédiés non reçus (lots de 40). */
export async function pollTracking(db: PrismaClient, provider: TrackingProvider | null, now = new Date()): Promise<{ outcome: TrackingOutcome; subOrderId?: string }[]> {
  if (!provider) return [];
  const [subs, rets] = await Promise.all([
    db.subOrder.findMany({ where: { status: "SHIPPED", trackingNumber: { not: "" } }, select: { trackingNumber: true, carrier: true }, take: 400 }),
    db.returnRequest.findMany({ where: { status: "ACCEPTED", returnShippedAt: { not: null }, returnTracking: { not: null } }, select: { returnTracking: true, returnCarrier: true }, take: 400 }),
  ]);
  const items = [
    ...subs.map((s) => ({ number: s.trackingNumber as string, carrierCode: carrierCodeFor(s.carrier ?? "") })),
    ...rets.map((r) => ({ number: r.returnTracking as string, carrierCode: carrierCodeFor(r.returnCarrier ?? "") })),
  ];
  const results: { outcome: TrackingOutcome; subOrderId?: string }[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    for (const u of await provider.getInfo(items.slice(i, i + BATCH))) {
      if (!u.delivered) continue;
      const r = await applyTrackingUpdate(db, u, now);
      if (r.outcome !== "ignored") results.push(r);
    }
  }
  return results;
}