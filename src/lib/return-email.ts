import { db } from "@/lib/db";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";
import { siteUrl } from "@/lib/alerts-core";
import { safeSend } from "@/lib/supplier-email";
import { reasonLabel } from "@/lib/refusal-reasons";
import { partnerRecipient } from "@/lib/partner-recipient";

export type ReturnMailKind = "requested" | "accepted" | "received" | "refused" | "refunded" | "shipped";

export type CustomerReturnMailKind = ReturnMailKind | "decided_accepted" | "decided_refused";

export type ReturnMailInput = {
  kind: CustomerReturnMailKind;
  damaged?: boolean;
  locale: "fr" | "en";
  subNumber: string;
  orderNumber?: string;
  firstName?: string;
  shop?: string;
  carrier?: string;
  tracking?: string;
  note?: string;
  amountCents: number;
  shipTo?: string;
  items: { name: string; quantity: number; size?: string | null; unitPriceCents: number; image?: string }[];
};

/** E-mails de retour côté client : ton sobre, vouvoiement, jamais le texte libre du créateur (le motif vient de la liste fixe). */
export function buildReturnEmail(o: ReturnMailInput): { subject: string; lines: string[]; html: string } {
  const fr = o.locale === "fr";
  const money = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const n = o.orderNumber ?? o.subNumber;
  const shop = o.shop || (fr ? "Le créateur" : "The creator");
  const hello = fr ? `Bonjour${o.firstName ? ` ${o.firstName}` : ""},` : `Hello${o.firstName ? ` ${o.firstName}` : ""},`;
  const ship = o.carrier || o.tracking ? [o.carrier, o.tracking ? (fr ? `n° ${o.tracking}` : `no. ${o.tracking}`) : ""].filter(Boolean).join(fr ? ", " : ", ") : "";
  const reason = (o.note ?? "").trim();
  const T = {
    requested: { title: fr ? "Votre demande de retour est enregistrée" : "Your return request is registered", p: fr ? `Nous avons bien reçu votre demande de retour pour la commande ${n}. Notre équipe l'examine et revient vers vous rapidement.` : `We have received your return request for order ${n}. Our team is reviewing it and will get back to you shortly.` },
    accepted: { title: fr ? "Votre retour est autorisé" : "Your return is authorised", p: fr ? `Votre retour est autorisé. Renvoyez la pièce à ${shop}, à l'adresse ci-dessous, puis confirmez l'expédition dans votre espace personnel, Moi › Mes commandes. Les frais de retour sont à votre charge, sauf pièce endommagée ou non conforme.` : `Your return is authorised. Send the piece back to ${shop} at the address below, then confirm the shipment in your personal space, Me › My orders. Return shipping is at your expense, unless the piece is damaged or not as described.` },
    shipped: { title: fr ? "Votre retour est en route" : "Your return is on its way", p: fr ? `Merci d'avoir confirmé l'expédition${ship ? ` (${ship})` : ""}. Nous vous informerons dès sa réception par ${shop}.` : `Thank you for confirming the shipment${ship ? ` (${ship})` : ""}. We will let you know as soon as ${shop} has received it.` },
    received: { title: fr ? "Votre retour a bien été reçu" : "Your return has been received", p: fr ? `${shop} a bien reçu votre pièce et procède à son contrôle. Vous recevrez sa décision sous 6 jours.` : `${shop} has received your piece and is checking it. You will receive its decision within 6 days.` },
    decided_accepted: { title: fr ? "Votre retour est accepté" : "Your return is accepted", p: fr ? `${shop} a accepté votre retour. Votre remboursement de ${money(o.amountCents)} est en cours.` : `${shop} has accepted your return. Your refund of ${money(o.amountCents)} is in progress.` },
    decided_refused: { title: fr ? "Votre retour n'a pas pu être validé" : "Your return could not be approved", p: fr ? `Après contrôle, ${shop} n'a pas pu valider votre retour${reason ? ` : ${reason}` : ""}. Notre équipe reste à votre disposition pour toute question.` : `After checking, ${shop} could not approve your return${reason ? `: ${reason}` : ""}. Our team remains at your disposal for any question.` },
    refused: { title: fr ? "Votre demande de retour n'a pas pu être acceptée" : "Your return request could not be accepted", p: fr ? `Votre demande de retour pour la commande ${n} n'a pas pu être acceptée${reason ? ` : ${reason}` : ""}. Notre équipe reste à votre disposition pour toute question.` : `Your return request for order ${n} could not be accepted${reason ? `: ${reason}` : ""}. Our team remains at your disposal for any question.` },
    refunded: { title: fr ? "Votre remboursement est effectué" : "Your refund has been made", p: fr ? `Nous avons remboursé ${money(o.amountCents)} sur votre moyen de paiement. Il apparaîtra sous 5 à 10 jours ouvrés. Les frais de livraison initiaux ne sont pas remboursés.` : `We have refunded ${money(o.amountCents)} to your payment method. It will appear within 5 to 10 business days. The initial delivery fees are not refunded.` },
  }[o.kind];
  const paragraphs = [hello, T.p];
  const html = renderEmailHtml({
    locale: o.locale,
    title: T.title,
    orderNumber: n,
    accountUrl: `${siteUrl()}/${o.locale}/account/orders`,
    paragraphs,
    cta: { label: fr ? "Voir ma commande" : "View my order", url: `${siteUrl()}/${o.locale}/account/orders` },
    summary: {
      items: o.items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: money(i.unitPriceCents * i.quantity), image: i.image ? absoluteImageUrl(i.image) : undefined })),
      rows: [{ label: fr ? "Montant du colis" : "Parcel amount", value: money(o.amountCents), bold: true }],
    },
    address: o.kind === "accepted" && o.shipTo ? { title: fr ? "Adresse de retour" : "Return address", lines: o.shipTo.split(", ").filter(Boolean) } : undefined,
  });
  return { subject: fr ? `${T.title} — commande ${n}` : `${T.title} — order ${n}`, lines: [...paragraphs, ...(o.kind === "accepted" && o.shipTo ? [o.shipTo] : [])], html };
}

/** E-mail au partenaire (créateur) : demande, accord, refus, réception, remboursement d'un retour de son colis. Même gabarit. */
export function buildPartnerReturnEmail(o: { kind: ReturnMailKind; locale: "fr" | "en"; partnerName: string; subNumber: string; note?: string; reason?: string; amountCents: number; items: ReturnMailInput["items"] }): { subject: string; lines: string[]; html: string } {
  const fr = o.locale === "fr";
  const money = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const T = {
    requested: { s: fr ? "retour demandé" : "return requested", t: fr ? "Un client demande le retour d'un colis" : "A customer requests a return", p: fr ? `Le client demande le retour du colis **${o.subNumber}**. L'administration examine la demande et arbitre ; vous n'avez rien à faire pour l'instant.` : `The customer requests a return for parcel **${o.subNumber}**. Our team reviews the request and decides; no action is needed from you for now.` },
    accepted: { s: fr ? "retour accepté" : "return accepted", t: fr ? "Retour accepté" : "Return accepted", p: fr ? `Le retour du colis **${o.subNumber}** est accepté. Le colis vous est envoyé par le client : vous le contrôlez à réception et décidez sous 6 jours (conforme, ou endommagé avec commentaire) depuis votre espace.` : `The return of parcel **${o.subNumber}** is accepted. The customer is sending the parcel to you: check it on arrival and decide within 6 days (as expected, or damaged with a comment) from your portal.` },
    refused: { s: fr ? "retour refusé" : "return refused", t: fr ? "Retour refusé" : "Return refused", p: fr ? `La demande de retour du colis **${o.subNumber}** est refusée. Votre vente est maintenue.` : `The return request for parcel **${o.subNumber}** is refused. Your sale stands.` },
    shipped: { s: fr ? "retour expédié" : "return shipped", t: fr ? "Le client a expédié son retour" : "The customer has shipped the return", p: fr ? `Le client a confirmé l'expédition du retour du colis **${o.subNumber}**${o.note ? ` (${o.note})` : ""}. À réception, confirmez l'état du colis depuis votre espace.` : `The customer has confirmed the shipment of the return for parcel **${o.subNumber}**${o.note ? ` (${o.note})` : ""}. On arrival, confirm the parcel's condition from your portal.` },
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
    const ship = kind === "shipped" ? await db.returnRequest.findFirst({ where: { subOrderId }, select: { returnCarrier: true, returnTracking: true } }) : null;
    if (ship) note = [ship.returnCarrier, ship.returnTracking].filter(Boolean).join(", ");
    const mail = buildPartnerReturnEmail({ kind, locale: app?.locale === "en" ? "en" : "fr", partnerName: supplier.displayName, subNumber: sub.number, note, reason: ret?.reason, amountCents: sub.subtotalCents, items: items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: img.get(i.productSlug) })) });
    await safeSend(to, mail.subject, mail.lines, mail.html);
  } catch {
    // l'e-mail ne doit jamais bloquer l'action
  }
}

/** Colis retour reçu : prévient le client ET le créateur (un seul point d'envoi pour 17TRACK et le bouton « J'ai reçu le colis »). */
export async function notifyReturnReceived(subOrderId: string) {
  await sendReturnMail(subOrderId, "received");
  await sendPartnerReturnMail(subOrderId, "received");
}

/** Charge le colis et envoie l'e-mail au client ; n'échoue jamais. */
export async function sendReturnMail(subOrderId: string, kind: CustomerReturnMailKind, note?: string, to?: string) {
  try {
    const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { email: true, number: true, locale: true, fullName: true } } } });
    if (!sub) return;
    const locale = sub.order.locale === "en" ? "en" : "fr";
    const items = await db.orderItem.findMany({ where: { subOrderId } });
    const prods = await db.product.findMany({ where: { slug: { in: items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
    const img = new Map(prods.map((p) => [p.slug, absoluteImageUrl(p.images)]));
    const ret = await db.returnRequest.findFirst({ where: { subOrderId }, select: { partnerReasonId: true, returnCarrier: true, returnTracking: true } }).catch(() => null);
    if (kind === "decided_refused") note = (await reasonLabel(db, ret?.partnerReasonId, locale)) ?? undefined;
    const supplier = await db.supplier.findUnique({ where: { id: sub.supplierId }, select: { displayName: true, address: true } }).catch(() => null);
    const mail = buildReturnEmail({
      kind,
      locale,
      subNumber: sub.number,
      orderNumber: sub.order.number,
      firstName: sub.order.fullName.trim().split(/\s+/)[0],
      shop: supplier?.displayName,
      carrier: ret?.returnCarrier ?? undefined,
      tracking: ret?.returnTracking ?? undefined,
      note,
      amountCents: sub.subtotalCents,
      shipTo: supplier?.address ? `${supplier.displayName}, ${supplier.address}` : undefined,
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: img.get(i.productSlug) })),
    });
    await safeSend(to ?? sub.order.email, mail.subject, mail.lines, mail.html);
  } catch {
    // l'e-mail ne doit jamais bloquer l'action
  }
}
