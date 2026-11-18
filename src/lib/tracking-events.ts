import type { PrismaClient } from "@prisma/client";
import { deliverSub } from "@/lib/suborders";
import type { TrackingUpdate } from "@/lib/tracking-provider";

export type TrackingOutcome = "delivered" | "return-received" | "ignored";

/** Applique une mise à jour de suivi : livraison du colis ou réception du retour, uniquement sur statut « Delivered ». Idempotent (gardes d'état). */
export async function applyTrackingUpdate(db: PrismaClient, u: TrackingUpdate, now = new Date()): Promise<{ outcome: TrackingOutcome; subOrderId?: string }> {
  if (!u.delivered) return { outcome: "ignored" };
  const sub = await db.subOrder.findFirst({ where: { trackingNumber: u.number, status: "SHIPPED" }, select: { id: true } });
  if (sub) {
    const done = await deliverSub(db, sub.id, null);
    return done ? { outcome: "delivered", subOrderId: sub.id } : { outcome: "ignored" };
  }
  const ret = await db.returnRequest.findFirst({ where: { returnTracking: u.number, status: "ACCEPTED", returnShippedAt: { not: null } }, select: { id: true, subOrderId: true } });
  if (ret) {
    const n = await db.returnRequest.updateMany({ where: { id: ret.id, status: "ACCEPTED" }, data: { status: "RECEIVED", partnerReceivedAt: now } });
    return n.count === 1 ? { outcome: "return-received", subOrderId: ret.subOrderId } : { outcome: "ignored" };
  }
  return { outcome: "ignored" };
}
