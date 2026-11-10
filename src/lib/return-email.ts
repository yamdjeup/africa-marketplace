import { db } from "@/lib/db";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";
import { siteUrl } from "@/lib/alerts-core";
import { safeSend } from "@/lib/supplier-email";

export type ReturnMailKind = "requested" | "accepted" | "refused" | "refunded";

export type ReturnMailInput = {
  kind: ReturnMailKind;
  locale: "fr" | "en";
  subNumber: string;
  orderNumber?: string;
  note?: string;
  amountCents: number;
  items: { name: string; quantity: number; size?: string | null; unitPriceCents: number; image?: string }[];
};

/** E-mails de retour (demande reçue, acceptée, refusée, remboursée) : même gabarit que les autres e-mails. */
export function buildReturnEmail(o: ReturnMailInput): { subject: string; lines: string[]; html: string } {
  const fr = o.locale === "fr";
  const money = (c: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const T = {
    requested: { subject: fr ? "demande de retour reçue" : "return request received", title: fr ? "Votre demande de retour est reçue" : "Your return request is received", p: fr ? [`Nous avons bien reçu votre demande de retour du colis **${o.subNumber}**. Notre équipe l'examine et revient vers vous rapidement.`] : [`We have received your return request for parcel **${o.subNumber}**. Our team is reviewing it and will get back to you shortly.`] },
    accepted: { subject: fr ? "retour accepté" : "return accepted", title: fr ? "Votre retour est accepté" : "Your return is accepted", p: fr ? [`Votre demande de retour du colis **${o.subNumber}** est acceptée. Vous serez remboursé de **${money(o.amountCents)}** après réception et contrôle du colis.`] : [`Your return request for parcel **${o.subNumber}** is accepted. You will be refunded **${money(o.amountCents)}** once the parcel is received and checked.`] },
    refused: { subject: fr ? "retour non accepté" : "return not accepted", title: fr ? "Votre demande de retour n'a pas pu être acceptée" : "Your return request could not be accepted", p: fr ? [`Votre demande de retour du colis **${o.subNumber}** n'a pas pu être acceptée.`] : [`Your return request for parcel **${o.subNumber}** could not be accepted.`] },
    refunded: { subject: fr ? "retour remboursé" : "return refunded", title: fr ? "Votre retour est remboursé" : "Your return is refunded", p: fr ? [`Votre retour du colis **${o.subNumber}** est remboursé : **${money(o.amountCents)}** sur votre moyen de paiement sous 5 à 10 jours ouvrés.`] : [`Your return for parcel **${o.subNumber}** is refunded: **${money(o.amountCents)}** to your payment method within 5 to 10 business days.`] },
  }[o.kind];
  const paragraphs = [...T.p, ...(o.kind === "refused" && o.note?.trim() ? [`${fr ? "Motif" : "Reason"} : ${o.note.trim()}`] : [])];
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

/** Charge le colis et envoie l'e-mail au client ; n'échoue jamais. */
export async function sendReturnMail(subOrderId: string, kind: ReturnMailKind, note?: string, to?: string) {
  try {
    const sub = await db.subOrder.findUnique({ where: { id: subOrderId }, include: { order: { select: { email: true, number: true, locale: true } } } });
    if (!sub) return;
    const items = await db.orderItem.findMany({ where: { subOrderId } });
    const prods = await db.product.findMany({ where: { slug: { in: items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
    const img = new Map(prods.map((p) => [p.slug, absoluteImageUrl(p.images)]));
    const mail = buildReturnEmail({ kind, locale: sub.order.locale === "en" ? "en" : "fr", subNumber: sub.number, orderNumber: sub.order.number, note, amountCents: sub.subtotalCents, items: items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: img.get(i.productSlug) })) });
    await safeSend(to ?? sub.order.email, mail.subject, mail.lines, mail.html);
  } catch {
    // l'e-mail ne doit jamais bloquer l'action
  }
}
