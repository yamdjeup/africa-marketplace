import { RETURN_DAYS } from "@/lib/returns";

type L = { fr: string; en: string };
export type TimelineStep = { key: string; label: L; at: string | null; reached: boolean };

type SubIn = { status: string; createdAt: Date; decidedAt: Date | null; shippedAt: Date | null; deliveredAt: Date | null };
type RetIn = { status: string; createdAt: Date; decidedAt: Date | null; partnerReceivedAt: Date | null; refundedAt: Date | null; returnShippedAt?: Date | null } | null;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const ENDED = ["CANCELLED", "REFUSED", "EXPIRED"];

/** Colis encore « actif » : en cours de traitement/livraison ou avec un retour en cours. */
export function parcelIsActive(status: string, returnStatus: string | null): boolean {
  if (ENDED.includes(status)) return false;
  if (returnStatus && ["REQUESTED", "ACCEPTED", "RECEIVED"].includes(returnStatus)) return true;
  return status !== "DELIVERED";
}

/** Une commande est active si l'un de ses colis l'est (ou si elle n'a pas encore de colis). */
export function orderBucket(parcels: { status: string; returnStatus: string | null }[]): "active" | "history" {
  return parcels.length === 0 || parcels.some((p) => parcelIsActive(p.status, p.returnStatus)) ? "active" : "history";
}

/** Étapes du colis avec l'horodatage stocké ; une date absente reste null (rien d'inventé). */
export function parcelTimeline(sub: SubIn, ret: RetIn, now = new Date()): TimelineStep[] {
  const st = sub.status;
  const steps: TimelineStep[] = [{ key: "ordered", label: { fr: "Commandée", en: "Ordered" }, at: iso(sub.createdAt), reached: true }];
  if (ENDED.includes(st)) {
    steps.push({ key: "cancelled", label: { fr: "Annulée", en: "Cancelled" }, at: iso(sub.decidedAt), reached: true });
    return steps;
  }
  const delivered = st === "DELIVERED";
  const shipped = delivered || st === "SHIPPED";
  const closed = delivered && (ret?.status === "REFUNDED" || ret?.status === "REFUSED" || (!ret && !!sub.deliveredAt && now.getTime() - sub.deliveredAt.getTime() > RETURN_DAYS * 86_400_000));
  steps.push(
    { key: "confirmed", label: { fr: "Confirmée", en: "Confirmed" }, at: iso(sub.decidedAt), reached: shipped || st === "ACCEPTED" || st === "PREPARING" },
    { key: "preparing", label: { fr: "En préparation", en: "Preparing" }, at: iso(sub.decidedAt), reached: shipped || st === "PREPARING" },
    { key: "shipped", label: { fr: "Expédiée", en: "Shipped" }, at: iso(sub.shippedAt), reached: shipped },
    { key: "delivered", label: { fr: "Livrée", en: "Delivered" }, at: iso(sub.deliveredAt), reached: delivered },
  );
  if (ret) {
    const refused = ret.status === "REFUSED";
    steps.push({ key: "ret-requested", label: { fr: "Retour demandé", en: "Return requested" }, at: iso(ret.createdAt), reached: true });
    if (refused) steps.push({ key: "ret-refused", label: { fr: "Retour refusé", en: "Return refused" }, at: iso(ret.decidedAt), reached: true });
    else {
      steps.push(
        { key: "ret-accepted", label: { fr: "Retour accepté", en: "Return accepted" }, at: iso(ret.decidedAt), reached: ret.status !== "REQUESTED" },
        { key: "ret-shipped", label: { fr: "Retour expédié", en: "Return shipped" }, at: iso(ret.returnShippedAt), reached: !!ret.returnShippedAt || ret.status === "RECEIVED" || ret.status === "REFUNDED" },
        { key: "ret-received", label: { fr: "Colis réceptionné", en: "Parcel received" }, at: iso(ret.partnerReceivedAt), reached: ret.status === "RECEIVED" || ret.status === "REFUNDED" },
        { key: "ret-refunded", label: { fr: "Remboursé", en: "Refunded" }, at: iso(ret.refundedAt), reached: ret.status === "REFUNDED" },
      );
    }
  }
  steps.push({ key: "closed", label: { fr: "Clôturée", en: "Closed" }, at: null, reached: closed });
  return steps;
}
