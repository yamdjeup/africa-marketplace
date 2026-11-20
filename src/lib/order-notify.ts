import { reasonLabel } from "@/lib/refusal-reasons";
import { captureOnConfirm, creatorWindowHours } from "@/lib/payment-mode";
import { RETURN_DAYS } from "@/lib/returns";
import "server-only";
import { siteUrl } from "@/lib/alerts-core";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";
import { db } from "@/lib/db";
import { safeSend } from "@/lib/supplier-email";
import { buildPartnerCancelEmail } from "@/lib/partner-cancel-email";
import { partnerRecipient } from "@/lib/partner-recipient";
import { carrierLabel, cleanTrackingNumber, trackingUrl } from "@/lib/tracking";
import { releaseExpiredHolds } from "@/lib/checkout-hold";
import { sweepSubOrders, sweepPrepReminders, sweepClosed } from "@/lib/suborders";
import { settleSubRefund } from "@/lib/refund";
import { pollTracking } from "@/lib/tracking-events";
import { getTrackingProvider } from "@/lib/tracking-provider";

export type SubEvent = "NEW" | "REMINDER" | "ESCALATION" | "PREP_REMINDER" | "PREP_ESCALATION" | "ACCEPTED" | "PREPARING" | "REFUSED" | "EXPIRED" | "CANCELLED" | "PARTNER_CANCELLED" | "PARTNER_EXPIRED" | "SHIPPED" | "DELIVERED" | "CLOSED";

export const eur = (c: number, fr = true) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);

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
    const carrierName = carrierLabel(sub.carrier, fr);
    const sold = fr ? `Vendu et expédié par ${shop} (${supplier.country}). E póm ta’ est l'intermédiaire.` : `Sold and shipped by ${shop} (${supplier.country}). E póm ta’ is the marketplace intermediary.`;

    if (event === "NEW" || event === "REMINDER") {
      const partnerTo = partnerRecipient(supplier, owner?.email);
      if (!partnerTo) return;
      const url = `${base}/fr/fournisseur/commandes/${sub.id}`;
      const subject = event === "NEW" ? `E póm ta’ — nouvelle commande ${sub.number}` : `E póm ta’ — rappel : commande ${sub.number} à accepter`;
      await safeSend(partnerTo, subject, [
        `Bonjour ${shop},`,
        `${event === "NEW" ? "Nouvelle commande" : "Rappel : commande en attente de votre réponse"} ${sub.number} — ${list} — ${eur(sub.subtotalCents)}.`,
        `Merci de l'accepter ou de la refuser avant le ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(sub.acceptBy)} ; sans réponse, elle est annulée et le client prévenu.`,
        url,
      ]);
      return;
    }
    if (event === "PARTNER_CANCELLED" || event === "PARTNER_EXPIRED") {
      const partnerTo = partnerRecipient(supplier, owner?.email);
      if (!partnerTo) return;
      const e = buildPartnerCancelEmail({ shop, number: sub.number, reason: sub.reason ?? "", kind: event === "PARTNER_EXPIRED" ? "EXPIRED" : "ADMIN", url: `${base}/fr/fournisseur/commandes/${sub.id}`, amount: eur(sub.subtotalCents), hours: creatorWindowHours() });
      await safeSend(partnerTo, e.subject, e.lines, e.html);
      return;
    }
    if (event === "PREP_REMINDER") {
      const partnerTo = partnerRecipient(supplier, owner?.email);
      if (!partnerTo) return;
      await safeSend(partnerTo, `E póm ta’ — colis ${sub.number} à préparer`, [
        `Bonjour ${shop},`,
        `Vous avez accepté le colis ${sub.number} (${list} — ${eur(sub.subtotalCents)}) il y a plus de 24 h et il n'est pas encore passé « En préparation ». Le client attend son envoi : merci de le préparer puis de l'expédier.`,
        `${base}/fr/fournisseur/commandes/${sub.id}`,
      ]);
      return;
    }
    if (event === "PREP_ESCALATION") {
      for (const to of (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean))
        await safeSend(to, `Colis ${sub.number} accepté depuis plus de 24 h, non préparé (${shop})`, [`${shop} n'a pas passé le colis ${sub.number} (${eur(sub.subtotalCents)}) en préparation 24 h après l'acceptation. Rappel envoyé au partenaire ; aucune annulation.`, `${base}/fr/admin/commandes`]);
      return;
    }
    if (event === "ESCALATION") {
      for (const to of (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean))
        await safeSend(to, `Escalade : commande ${sub.number} sans réponse de ${shop}`, [`${shop} n'a pas répondu à la commande ${sub.number} (${eur(sub.subtotalCents)}). Expiration : ${sub.acceptBy.toISOString()}.`, `${base}/fr/admin/commandes`]);
      return;
    }

    const reasonTxt = await reasonLabel(db, sub.reasonId, fr ? "fr" : "en");
    const amt = eur(sub.subtotalCents, fr);
    const rs = sub.refundStatus;
    const refundFr = rs === "DONE" || rs === "AWAITING" || rs === "REQUESTED" ? ` Vous serez remboursé de ${amt} sur votre moyen de paiement sous 5 à 10 jours ouvrés.` : rs === "FAILED" ? " Nous revenons vers vous très prochainement au sujet de votre remboursement." : "";
    const refundEn = rs === "DONE" || rs === "AWAITING" || rs === "REQUESTED" ? ` You will be refunded ${amt} to your payment method within 5 to 10 business days.` : rs === "FAILED" ? " We will get back to you shortly about your refund." : "";
    const hold = captureOnConfirm();
    const hours = creatorWindowHours();
    const noCharge = hold ? (fr ? " Aucun montant n'a été prélevé, la réservation sur votre carte est levée." : " No amount has been charged, the reservation on your card is released.") : fr ? refundFr : refundEn;
    const invite = fr ? " Nous vous invitons à retrouver d'autres créations dans la même sélection." : " We invite you to discover other creations in the same selection.";
    const why = reasonTxt ? (fr ? ` Motif : ${reasonTxt}.` : ` Reason: ${reasonTxt}.`) : "";
    const shipInfo = [carrierName, sub.trackingNumber ? (fr ? `numéro de suivi : ${cleanTrackingNumber(sub.trackingNumber)}` : `tracking number: ${cleanTrackingNumber(sub.trackingNumber)}`) : ""].filter(Boolean);
    const msgs: Record<string, [string, string]> = {
      ACCEPTED: [fr ? "Votre commande est confirmée" : "Your order is confirmed", fr ? `${shop} a confirmé votre commande et prépare votre pièce avec soin.${hold && sub.capturedCents > 0 ? ` Votre carte est débitée de ${amt}.` : ""} Nous vous avertirons dès son départ.` : `${shop} has confirmed your order and is carefully preparing your piece.${hold && sub.capturedCents > 0 ? ` Your card is charged ${amt}.` : ""} We will let you know as soon as it leaves.`],
      PREPARING: [fr ? "Votre pièce est en préparation" : "Your piece is being prepared", fr ? `${shop} prépare votre commande avec soin. Vous serez averti dès son expédition.` : `${shop} is carefully preparing your order. You will be notified as soon as it ships.`],
      REFUSED: [fr ? "Votre commande n'a pas pu être confirmée" : "Your order could not be confirmed", fr ? `Nous sommes désolés de vous informer que votre commande ne peut pas être honorée.\n\n${why.trim()}\n\n${(noCharge + invite).trim()}` : `We are sorry to inform you that your order cannot be fulfilled.\n\n${why.trim()}\n\n${(noCharge + invite).trim()}`],
      EXPIRED: [fr ? "Votre commande n'a pas pu être confirmée" : "Your order could not be confirmed", fr ? `Nous sommes désolés de vous informer que votre commande a été automatiquement annulée, car le créateur ne l'a pas confirmée dans le délai imparti de ${hours} heures.\n\n${(noCharge + invite).trim()}` : `We are sorry to inform you that your order has been automatically cancelled, because the creator did not confirm it within the allotted ${hours} hours.\n\n${(noCharge + invite).trim()}`],
      CANCELLED: [fr ? "Votre commande est annulée" : "Your order is cancelled", fr ? `Votre commande est annulée. Motif : ${sub.reason || "non précisé"}.${refundFr}` : `Your order is cancelled. Reason: ${sub.reason || "not specified"}.${refundEn}`],
      SHIPPED: [fr ? "Votre pièce est en route" : "Your piece is on its way", fr ? `Bonne nouvelle, votre pièce est en route.${shipInfo.length ? ` Elle est confiée à ${shipInfo.join(", ")}.` : ""}` : `Good news, your piece is on its way.${shipInfo.length ? ` It has been handed to ${shipInfo.join(", ")}.` : ""}`],
      DELIVERED: [fr ? "Votre pièce est arrivée" : "Your piece has arrived", fr ? `Votre pièce est arrivée. Nous espérons qu'elle vous ravit. Vous disposez de ${RETURN_DAYS} jours pour un éventuel retour.` : `Your piece has arrived. We hope it delights you. You have ${RETURN_DAYS} days for a possible return.`],
      CLOSED: [fr ? "Votre commande est clôturée" : "Your order is closed", fr ? `Votre commande ${o.number} est désormais clôturée. Merci de votre confiance, nous espérons vous retrouver bientôt parmi nos créateurs.` : `Your order ${o.number} is now closed. Thank you for your trust, we hope to see you again soon among our creators.`],
    };
    const m = msgs[event];
    if (!m || !o.email) return;
    const blocks = m[1].split("\n\n").map((x) => x.trim()).filter(Boolean);
    const n = sub.number;
    const subjects: Partial<Record<SubEvent, string>> = fr
      ? { ACCEPTED: `Votre commande ${n} est confirmée`, PREPARING: `Votre commande ${n} est en préparation`, SHIPPED: `Votre commande ${n} est en route`, DELIVERED: `Votre commande ${n} est arrivée`, REFUSED: `Votre commande ${n} n'a pas pu être confirmée`, EXPIRED: `Votre commande ${n} n'a pas pu être confirmée`, CANCELLED: `Votre commande ${n} est annulée`, CLOSED: `Votre commande ${n} est clôturée` }
      : { ACCEPTED: `Your order ${n} is confirmed`, PREPARING: `Your order ${n} is being prepared`, SHIPPED: `Your order ${n} is on its way`, DELIVERED: `Your order ${n} has arrived`, REFUSED: `Your order ${n} could not be confirmed`, EXPIRED: `Your order ${n} could not be confirmed`, CANCELLED: `Your order ${n} is cancelled`, CLOSED: `Your order ${n} is closed` };
    const subject = subjects[event] ?? m[0];
    const loc = fr ? "fr" : "en";
    const link = o.userId ? `${base}/${loc}/account/orders/${o.number}` : `${base}/${loc}/checkout/confirmation/${o.number}?t=${o.editToken ?? ""}`;
    const first = o.fullName.trim().split(/\s+/)[0];
    const hello = fr ? (first ? `Bonjour ${first},` : "Bonjour,") : (first ? `Hello ${first},` : "Hello,");
    const siblings = await db.subOrder.findMany({ where: { orderId: o.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
    const idx = siblings.findIndex((s) => s.id === sub.id) + 1;
    const parcel = idx > 0 ? (fr ? `Colis ${idx} sur ${siblings.length}` : `Parcel ${idx} of ${siblings.length}`) : "";
    const parcelNote = parcel && (event === "SHIPPED" || event === "DELIVERED") ? parcel : "";
    const trackUrl = trackingUrl(sub.carrier, sub.trackingNumber);
    const prods = await db.product.findMany({ where: { slug: { in: items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
    const imgOf = new Map(prods.map((p) => [p.slug, absoluteImageUrl(p.images)]));
    const html = renderEmailHtml({
      locale: loc,
      title: m[0],
      orderNumber: sub.number,
      accountUrl: o.userId ? link : undefined,
      paragraphs: [hello, ...(parcelNote ? [`**${parcelNote}**`] : []), ...blocks],
      cta: event === "DELIVERED" || event === "CLOSED" ? { label: fr ? "Voir ma commande" : "View my order", url: link } : { label: fr ? "Suivre ma commande" : "Track my order", url: link },
      trackLink: trackUrl && (event === "SHIPPED" || event === "DELIVERED") ? { label: fr ? "Suivre mon colis" : "Track my parcel", url: trackUrl } : undefined,
      summary: { items: items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: eur(i.unitPriceCents * i.quantity, fr), image: imgOf.get(i.productSlug), url: `${siteUrl()}/${loc}/produits/${i.productSlug}` })), rows: [{ label: fr ? "Sous-total" : "Subtotal", value: eur(sub.subtotalCents, fr), bold: true }] },
      notice: sold,
      address: event === "SHIPPED" || event === "DELIVERED" ? { title: fr ? "Adresse de livraison" : "Delivery address", lines: [o.fullName, o.address, `${o.postalCode} ${o.city}`.trim(), o.country, ...(o.phone ? [`${fr ? "Téléphone" : "Phone"} : ${o.phone}`] : [])] } : undefined,
    });
    await safeSend(o.email, subject, [hello, ...(parcelNote ? [parcelNote] : []), ...blocks, list, sold, link, ...(trackUrl && (event === "SHIPPED" || event === "DELIVERED") ? [`${fr ? "Suivre mon colis" : "Track my parcel"} : ${trackUrl}`] : [])], html);
  } catch (e) {
    console.warn("[order-notify]", (e as Error).message);
  }
}

/** Relances, escalades et expirations (appelé par le cron, au chargement des pages commandes et après chaque commande). */
export async function runSubOrderSweep() {
  await releaseExpiredHolds(db);
  const r = await sweepSubOrders(db);
  for (const s of r.reminded) await notifySubOrder("REMINDER", s.id);
  for (const s of r.escalated) await notifySubOrder("ESCALATION", s.id);
  for (const s of r.expired) {
    await settleSubRefund(s.id);
    await notifySubOrder("EXPIRED", s.id);
    await notifySubOrder("PARTNER_EXPIRED", s.id);
  }
  const late = await sweepPrepReminders(db);
  for (const s of late) {
    await notifySubOrder("PREP_REMINDER", s.id);
    await notifySubOrder("PREP_ESCALATION", s.id);
  }
  for (const s of await sweepClosed(db)) await notifySubOrder("CLOSED", s.id);
  return { prepLate: late.length, reminded: r.reminded.length, escalated: r.escalated.length, expired: r.expired.length };
}

/** Rattrapage 17TRACK (cron) : livraisons / retours reçus manqués par le webhook, avec les mêmes e-mails. */
export async function runTrackingPoll() {
  const done = await pollTracking(db, getTrackingProvider());
  for (const r of done) {
    if (!r.subOrderId) continue;
    if (r.outcome === "delivered") await notifySubOrder("DELIVERED", r.subOrderId);
    else {
      const { sendReturnMail } = await import("@/lib/return-email");
      await sendReturnMail(r.subOrderId, "received");
    }
  }
  return done.length;
}