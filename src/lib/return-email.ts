import { db } from "@/lib/db";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";
import { siteUrl } from "@/lib/alerts-core";
import { safeSend } from "@/lib/supplier-email";
import { reasonLabel } from "@/lib/refusal-reasons";
import { partnerRecipient } from "@/lib/partner-recipient";

export type ReturnMailKind = "requested" | "accepted" | "received" | "refused" | "refunded";

export type CustomerReturnMailKind = ReturnMailKind | "decided_accepted" | "decided_refused";

export type ReturnMailInput = {
  kind: CustomerReturnMailKind;
  damaged?: boolean;
  locale: "fr" | "en";
  subNumber: string;
  orderNumber?: string;
  note?: string;
  amountCents: number;
  shipTo?: string;
  items: { name: string; quantity: number; size?: string | null; unitPriceCents: number; image?: string }[];
};

/** E-mails de retour (demande reçue, acceptée, refusée, remboursée) : même gabarit que les autres e-mails. */
export function buildReturnEmail(o: ReturnMailInput): { subject: string; lines: string[]; html: string } {
  const fr = o.locale === "fr";
  const money = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const T = {
    requested: { subject: fr ? "demande de retour reçue" : "return request received", title: fr ? "Votre demande de retour est reçue" : "Your return request is received", p: fr ? [`Nous avons bien reçu votre demande de retour du colis **${o.subNumber}**. Notre équipe l'examine et revient vers vous rapidement.`] : [`We have received your return request for parcel **${o.subNumber}**. Our team is reviewing it and will get back to you shortly.`] },
    accepted: { subject: fr ? "retour accepté" : "return accepted", title: fr ? "Votre retour est accepté" : "Your return is accepted", p: fr ? [`Votre demande de retour du colis **${o.subNumber}** est acceptée. Vous serez remboursé de **${money(o.amountCents)}** après réception et contrôle du colis. **Renvoyez le colis directement au créateur** : ${o.shipTo ? `adresse : ${o.shipTo}` : "son adresse vous sera communiquée par notre équipe"}. Les frais d'envoi du retour sont à votre charge, sauf article endommagé ou non conforme. Les frais de livraison initiaux ne sont pas remboursés.`] : [`Your return request for parcel **${o.subNumber}** is accepted. You will be refunded **${money(o.amountCents)}** once the parcel is received and checked. **Please send the parcel directly to the creator**: ${o.shipTo ? `address: ${o.shipTo}` : "our team will send you the address"}. Return shipping is at your expense, unless the item is damaged or not as described. Original delivery fees are not refunded.`] },
    refused: { subject: fr ? "retour non accepté" : "return not accepted", title: fr ? "Votre demande de retour n'a pas pu être acceptée" : "Your return request could not be accepted", p: fr ? [`Votre demande de retour du colis **${o.subNumber}** n'a pas pu être acceptée.`] : [`Your return request for parcel **${o.subNumber}** could not be accepted.`] },
    received: { subject: fr ? "retour réceptionné" : "return received", title: fr ? "Nous avons reçu votre retour" : "We have received your return", p: fr ? [`Nous avons bien reçu le colis retourné **${o.subNumber}**. ${o.damaged ? "Il est en cours de contrôle : le créateur nous indique qu'il est endommagé ou non conforme. Nous revenons vers vous après examen ; aucun remboursement n'est confirmé à ce stade." : `Il est en cours de contrôle ; le remboursement de **${money(o.amountCents)}** suit après vérification. Les frais de livraison ne sont pas remboursés.`}`] : [`We have received the returned parcel **${o.subNumber}**. ${o.damaged ? "It is being checked: the creator reports it as damaged or not as described. We will get back to you after review; no refund is confirmed at this stage." : `It is being checked; the refund of **${money(o.amountCents)}** follows after verification. Delivery fees are not refunded.`}`] },
    decided_accepted: { subject: fr ? "retour validé, remboursement en cours" : "return approved, refund in progress", title: fr ? "Votre remboursement est en cours" : "Your refund is in progress", p: fr ? [`Le créateur a validé le retour du colis **${o.subNumber}**. Votre remboursement de **${money(o.amountCents)}** est en cours de traitement ; vous recevrez un e-mail de confirmation dès qu'il sera effectué.`] : [`The creator has approved the return of parcel **${o.subNumber}**. Your refund of **${money(o.amountCents)}** is being processed; you will receive a confirmation e-mail once it is done.`] },
    decided_refused: { subject: fr ? "retour non validé" : "return not approved", title: fr ? "Votre retour n'a pas été validé" : "Your return was not approved", p: fr ? [`Après contrôle, le créateur n'a pas validé le retour du colis **${o.subNumber}**. Notre équipe examine la situation et revient vers vous.`] : [`After checking, the creator did not approve the return of parcel **${o.subNumber}**. Our team is reviewing the situation and will get back to you.`] },
    refunded: { subject: fr ? "retour remboursé" : "return refunded", title: fr ? "Votre retour est remboursé" : "Your return is refunded", p: fr ? [`Votre retour du colis **${o.subNumber}** est remboursé : **${money(o.amountCents)}** sur votre moyen de paiement sous 5 à 10 jours ouvrés.`] : [`Your return for parcel **${o.subNumber}** is refunded: **${money(o.amountCents)}** to your payment method within 5 to 10 business days.`] },
  }[o.kind];
  const paragraphs = [...T.p, ...((o.kind === "refused" || o.kind === "decided_refused") && o.note?.trim() ? [`${fr ? "Motif" : "Reason"} : ${o.note.trim()}`] : [])];
  const html = renderEmailHtml({
    locale: o.locale,
    title: T.title,
    orderNumber: o.orderNumber ?? o.subNumber,
    accountUrl: `${siteUrl()}/${o.locale}/account/orders`,
    paragraphs,
    cta: { label: fr ? "Voir ma commande" : "View my order", url: `${siteUrl()}/${o.locale}/account/orders` },
    summary: {
      items: o.items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: money(i.unitPriceCents * i.quantity), image: i.image ? absoluteImageUrl(i.image) : undefined })),
      rows: [{ label: fr ? "Montant du colis" : "Parcel amount", value: money(o.amountCents), bold: true }],
    },
  });
  return { subject: `E póm ta’ — ${T.subject} ${o.subNumber}`, lines: [fr ? "Bonjour," : "Hello,", ...paragraphs.map((p) => p.replace(/\*\*/g, ""))], html };
}

/** E-mail au partenaire (créateur) : demande, accord, refus, réception, remboursement d'un retour de son colis. Même gabarit. */
export function buildPartnerReturnEmail(o: { kind: ReturnMailKind; locale: "fr" | "en"; partnerName: string; subNumber: string; note?: string; reason?: string; amountCents: number; items: ReturnMailInput["items"] }): { subject: string; lines: string[]; html: string } {
  const fr = o.locale === "fr";
  const money = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const T = {
    requested: { s: fr ? "retour demandé" : "return requested", t: fr ? "Un client demande le retour d'un colis" : "A customer requests a return", p: fr ? `Le client demande le retour du colis **${o.subNumber}**. L'administration examine la demande et arbitre ; vous n'avez rien à faire pour l'instant.` : `The customer requests a return for parcel **${o.subNumber}**. Our team reviews the request and decides; no action is needed from you for now.` },
    accepted: { s: fr ? "retour accepté" : "return accepted", t: fr ? "Retour accepté" : "Return accepted", p: fr ? `Le retour du colis **${o.subNumber}** est accepté. Le colis vous est envoyé par le client : vous le contrôlez à réception et décidez sous 6 jours (conforme, ou endommagé avec commentaire) depuis votre espace.` : `The return of parcel **${o.subNumber}** is accepted. The customer is sending the parcel to you: check it on arrival and decide within 6 days (as expected, or damaged with a comment) from your portal.` },
    refused: { s: fr ? "retour refusé" : "return refused", t: fr ? "Retour refusé" : "Return refused", p: fr ? `La demande de retour du colis **${o.subNumber}** est refusée. Votre vente est maintenue.` : `The return request for parcel **${o.subNumber}** is refused. Your sale stands.` },
    received: { s: fr ? "retour réceptionné" : "return received", t: fr ? "Colis retour réceptionné" : "Returned parcel received", p: fr ? `Le colis retourné **${o.subNumber}** a été réceptionné et est en cours de contrôle.` : `The returned parcel **${o.subNumber}** has been received and is being checked.` },
    refunded: { s: fr ? "retour remboursé" : "return refunded", t: fr ? "Retour remboursé" : "Return refunded", p: fr ? `Le client a été remboursé de **${money(o.amountCents)}** pour le colis **${o.subNumber}**. Cette vente est annulée dans votre relevé.` : `The customer has been refunded **${money(o.amountCents)}** for parcel **${o.subNumber}**. This sale is reversed in your statement.` },
  }[o.kind];
  const paragraphs = [fr ? `Bonjour ${o.partnerName},` : `Hello ${o.partnerName},`, T.p, ...(o.kind === "requested" && o.reason?.trim() ? [`${fr ? "Motif du client" : "Customer reason"} : ${o.reason.trim()}`] : []), ...(o.kind === "refused" && o.note?.trim() ? [`${fr ? "Motif" : "Reason"} : ${o.note.trim()}`] : [])];
  const url = `${siteUrl()}/${o.locale}/fournisseur/commandes`;
  const html = renderEmailHtml({
    locale: o.locale,
    title: T.t,
    orderNumber: o.subNumber,
    accountUrl: url,
    paragraphs,
    cta: { label: fr ? "Voir mes commandes" : "View my orders", url },
    summary: {
      items: o.items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: money(i.unitPriceCents * i.quantity), image: i.image ? absoluteImageUrl(i.image) : undefined })),
      rows: [{ label: fr ? "Montant du colis" : "Parcel amount", value: money(o.amountCents), bold: true }],
    },
  });
  return { subject: `E póm ta’ — ${T.s} ${o.subNumber}`, lines: paragraphs.map((p) => p.replace(/\*\*/g, "")), html };
}

/** Prévient le partenaire du colis ; n'échoue jamais. */
export async function sendPartnerReturnMail(subOrderId: string, kind: ReturnMailKind, note?: string) {
  try {
    const sub = await db.subOrder.findUnique({ where: { id: subOrderId } });
    if (!sub) return;
    const supplier = await db.supplier.findUnique({ where: { id: sub.supplierId } });
    if (!supplier) return;
    const owner = supplier.userId ? await db.user.findUnique({ where: { id: supplier.userId } }) : null;
    const to = partnerRecipient(supplier, owner?.email);
    if (!to) return;
    const app = supplier.userId ? await db.supplierApplication.findFirst({ where: { userId: supplier.userId }, orderBy: { createdAt: "desc" }, select: { locale: true } }) : null;
    const ret = await db.returnRequest.findFirst({ where: { subOrderId }, select: { reason: true } });
    const items = await db.orderItem.findMany({ where: { subOrderId } });
    const prods = await db.product.findMany({ where: { slug: { in: items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
    const img = new Map(prods.map((p) => [p.slug, absoluteImageUrl(p.images)]));
    const mail = buildPartnerReturnEmail({ kind, locale: app?.locale === "en" ? "en" : "fr", partnerName: supplier.displayName, subNumber: sub.number, note, reason: ret?.reason, amountCents: sub.subtotalCents, items: items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: img.get(i.productSlug) })) });
    await safeSend(to, mail.subject, mail.lines, mail.html);
  } catch {
    // l'e-mail ne doit jamais bloquer l'action
  }
}

/** Charge le colis et envoie l'e-mail au client ; n'échoue jamais. */
export async function sendReturnMail(subOrderId: string, kind: CustomerReturnMailKind, note?: string, to?: string) {
  try {
    const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { email: true, number: true, locale: true } } } });
    if (!sub) return;
    const items = await db.orderItem.findMany({ where: { subOrderId } });
    const prods = await db.product.findMany({ where: { slug: { in: items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
    const img = new Map(prods.map((p) => [p.slug, absoluteImageUrl(p.images)]));
    const retRow = kind === "decided_refused" ? await db.returnRequest.findFirst({ where: { subOrderId }, select: { partnerReasonId: true } }) : null;
    if (kind === "decided_refused") note = (await reasonLabel(db, retRow?.partnerReasonId, sub.order.locale === "en" ? "en" : "fr")) ?? undefined;
    const damaged = kind === "received" ? (await db.returnRequest.findFirst({ where: { subOrderId }, select: { condition: true } }).catch(() => null))?.condition === "DAMAGED" : false;
    const mail = buildReturnEmail({ kind, damaged, locale: sub.order.locale === "en" ? "en" : "fr", subNumber: sub.number, orderNumber: sub.order.number, note, amountCents: sub.subtotalCents, shipTo: (await db.supplier.findUnique({ where: { id: sub.supplierId }, select: { displayName: true, address: true } }).then((s) => (s?.address ? `${s.displayName}, ${s.address}` : undefined), () => undefined)), items: items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: img.get(i.productSlug) })) });
    await safeSend(to ?? sub.order.email, mail.subject, mail.lines, mail.html);
  } catch {
    // l'e-mail ne doit jamais bloquer l'action
  }
}
