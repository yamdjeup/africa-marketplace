import "server-only";
import { siteUrl } from "@/lib/alerts-core";
import { db } from "@/lib/db";
import { safeSend } from "@/lib/supplier-email";
import { sweepSubOrders } from "@/lib/suborders";

export type SubEvent = "NEW" | "REMINDER" | "ESCALATION" | "ACCEPTED" | "REFUSED" | "EXPIRED" | "CANCELLED" | "SHIPPED" | "DELIVERED";

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/** E-mails d'une sous-commande : partenaire (nouvelle commande, relance), admin (escalade), client (chaque changement d'état). */
export async function notifySubOrder(event: SubEvent, subOrderId: string) {
  try {
    const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: true } });
    if (!sub) return;
    const [supplier, items] = await Promise.all([db.supplier.findUnique({ where: { id: sub.supplierId } }), db.orderItem.findMany({ where: { subOrderId } })]);
    if (!supplier) return;
    const owner = supplier.userId ? await db.user.findUnique({ where: { id: supplier.userId } }) : null;
    const base = siteUrl();
    const o = sub.order;
    const fr = o.locale !== "en";
    const list = items.map((i) => `${i.quantity} × ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ");
    const shop = supplier.displayName;
    const sold = fr ? `Vendu et expédié par ${shop} (${supplier.country}). E póm ta’ est l'intermédiaire.` : `Sold and shipped by ${shop} (${supplier.country}). E póm ta’ is the marketplace intermediary.`;

    if (event === "NEW" || event === "REMINDER") {
      if (!owner?.email) return;
      const url = `${base}/fr/fournisseur/commandes/${sub.id}`;
      const subject = event === "NEW" ? `E póm ta’ — nouvelle commande ${sub.number}` : `E póm ta’ — rappel : commande ${sub.number} à accepter`;
      await safeSend(owner.email, subject, [
        `Bonjour ${shop},`,
        `${event === "NEW" ? "Nouvelle commande" : "Rappel : commande en attente de votre réponse"} ${sub.number} — ${list} — ${eur(sub.subtotalCents)}.`,
        `Merci de l'accepter ou de la refuser avant le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(sub.acceptBy)} ; sans réponse, elle est annulée et le client prévenu.`,
        url,
      ]);
      return;
    }
    if (event === "ESCALATION") {
      for (const to of (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean))
        await safeSend(to, `Escalade : commande ${sub.number} sans réponse de ${shop}`, [`${shop} n'a pas répondu à la commande ${sub.number} (${eur(sub.subtotalCents)}). Expiration : ${sub.acceptBy.toISOString()}.`, `${base}/fr/admin/commandes`]);
      return;
    }

    const msgs: Record<string, [string, string]> = {
      ACCEPTED: [fr ? "commande acceptée" : "order accepted", fr ? `${shop} a accepté votre commande et la prépare.` : `${shop} accepted your order and is preparing it.`],
      REFUSED: [fr ? "commande annulée" : "order cancelled", fr ? `${shop} ne peut pas honorer votre commande. Elle est annulée et le stock libéré. Motif : ${sub.reason || "non précisé"}.` : `${shop} cannot fulfil your order. It is cancelled. Reason: ${sub.reason || "not specified"}.`],
      EXPIRED: [fr ? "commande annulée" : "order cancelled", fr ? `${shop} n'a pas répondu sous 48 h : votre commande est annulée.` : `${shop} did not reply within 48 h: your order is cancelled.`],
      CANCELLED: [fr ? "commande annulée" : "order cancelled", fr ? `Votre commande est annulée. Motif : ${sub.reason || "non précisé"}.` : `Your order is cancelled. Reason: ${sub.reason || "not specified"}.`],
      SHIPPED: [fr ? "commande expédiée" : "order shipped", fr ? `${shop} a expédié votre commande${sub.carrier ? ` (${sub.carrier}` : ""}${sub.trackingNumber ? `${sub.carrier ? ", " : " ("}suivi ${sub.trackingNumber}` : ""}${sub.carrier || sub.trackingNumber ? ")" : ""}.` : `${shop} shipped your order${sub.carrier ? ` (${sub.carrier}` : ""}${sub.trackingNumber ? `${sub.carrier ? ", " : " ("}tracking ${sub.trackingNumber}` : ""}${sub.carrier || sub.trackingNumber ? ")" : ""}.`],
      DELIVERED: [fr ? "commande livrée" : "order delivered", fr ? "Votre commande est livrée. Merci !" : "Your order is delivered. Thank you!"],
    };
    const m = msgs[event];
    if (!m || !o.email) return;
    const loc = fr ? "fr" : "en";
    const link = o.userId ? `${base}/${loc}/account/orders/${o.number}` : `${base}/${loc}/checkout/confirmation/${o.number}?t=${o.editToken ?? ""}`;
    await safeSend(o.email, `E póm ta’ — ${m[0]} ${sub.number}`, [fr ? `Bonjour ${o.fullName},` : `Hello ${o.fullName},`, m[1], list, sold, link]);
  } catch (e) {
    console.warn("[order-notify]", (e as Error).message);
  }
}

/** Relances, escalades et expirations (appelé par le cron, au chargement des pages commandes et après chaque commande). */
export async function runSubOrderSweep() {
  const r = await sweepSubOrders(db);
  for (const s of r.reminded) await notifySubOrder("REMINDER", s.id);
  for (const s of r.escalated) await notifySubOrder("ESCALATION", s.id);
  for (const s of r.expired) await notifySubOrder("EXPIRED", s.id);
  return { reminded: r.reminded.length, escalated: r.escalated.length, expired: r.expired.length };
}
