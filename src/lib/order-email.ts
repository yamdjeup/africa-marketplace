import { siteUrl } from "@/lib/alerts-core";
import { sendEmail } from "@/lib/email";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";
import { db } from "@/lib/db";
import { captureOnConfirm, creatorWindowHours } from "@/lib/payment-mode";

export type OrderEmailInput = {
  to: string;
  locale: "fr" | "en";
  number: string;
  fullName: string;
  items: { name: string; quantity: number; size?: string | null; unitPriceCents: number; image?: string }[];
  totalCents: number;
  /** Boutiques (créateurs) auxquelles la commande est transmise. */
  shops?: string[];
  shipping?: { lines: string[]; phone: string; editUrl?: string };
};

export function buildOrderEmail(o: OrderEmailInput) {
  const fr = o.locale === "fr";
  const money = (cents: number) =>
    new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(cents / 100);
  const hold = captureOnConfirm();
  const hours = creatorWindowHours();
  const shops = (o.shops?.length ? o.shops.join(fr ? " et " : " and ") : fr ? "le créateur" : "the creator");
  const t = fr
    ? {
        subject: "Votre commande est transmise",
        hello: `Bonjour ${o.fullName},`,
        intro: `Votre commande a été transmise à ${shops}, qui dispose de ${hours} heures pour ${hold ? "la confirmer" : "l'accepter"}.`,
        view: "Voir ma commande",
        notice: hold ? `Votre carte ne sera débitée qu'à cette confirmation, que nous vous notifierons par e-mail. Un montant de ${money(o.totalCents)} peut apparaître « en attente » sur votre relevé : il s'agit d'une simple réservation, qui ne devient un paiement qu'à la confirmation.` : "Votre paiement par carte a bien été enregistré.",
        num: "Numéro de commande",
        works: "Créations",
        total: "Total",
        shipTo: "Adresse de livraison",
        phone: "Téléphone",
        mistake: "Une erreur ? Modifiez l'adresse tant que la commande n'est pas expédiée, ou contactez-nous.",
        edit: "Modifier l'adresse",
        bye: "Merci de votre confiance.",
      }
    : {
        subject: "Your order has been sent",
        hello: `Hello ${o.fullName},`,
        intro: `Your order has been sent to ${shops}, who has up to ${hours} hours to ${hold ? "confirm it" : "accept it"}.`,
        view: "View my order",
        notice: hold ? `Your card will only be charged once the order is confirmed, and we will notify you by email. An amount of ${money(o.totalCents)} may appear as "pending" on your statement: it is a simple reservation, which only becomes a payment on confirmation.` : "Your card payment has been recorded.",
        num: "Order number",
        works: "Creations",
        total: "Total",
        shipTo: "Delivery address",
        phone: "Phone",
        mistake: "A mistake? Edit the address until the order has shipped, or contact us.",
        edit: "Edit address",
        bye: "Thank you for your trust.",
      };
  const orderUrl = `${siteUrl()}/${o.locale}/account/orders/${o.number}`;
  const lines = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity} — ${money(i.unitPriceCents * i.quantity)}`);
  const ship = o.shipping;
  const shipText = ship
    ? ["", `${t.shipTo} :`, ...ship.lines, `${t.phone} : ${ship.phone}`, t.mistake, ...(ship.editUrl ? [`${t.edit} : ${ship.editUrl}`] : [])]
    : [];
  const text = [t.hello, "", t.intro, "", `${t.num} : ${o.number}`, `${t.view} : ${orderUrl}`, `${t.works} :`, ...lines.map((l) => `- ${l}`), "", `${t.total} : ${money(o.totalCents)}`, ...shipText, "", t.bye].join("\n");
  const html = renderEmailHtml({
    locale: o.locale,
    title: fr ? "Votre commande est transmise" : "Your order has been sent",
    orderNumber: o.number,
    paragraphs: [t.hello, t.intro],
    cta: { label: t.view, url: orderUrl },
    summary: {
      items: o.items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: money(i.unitPriceCents * i.quantity), image: i.image ? absoluteImageUrl(i.image) : undefined })),
            rows: [{ label: t.total, value: money(o.totalCents), bold: true }],
    },
    address: ship ? { title: t.shipTo, lines: [...ship.lines, `${t.phone} : ${ship.phone}`] } : undefined,
    notice: `${t.notice} ${ship ? t.mistake : ""} ${t.bye}`,
  });
  return { subject: t.subject, text, html };
}

// Ne lève jamais : une commande ne doit pas échouer à cause de l'e-mail.
export async function sendOrderEmail(o: OrderEmailInput): Promise<void> {
  let shops = o.shops;
  if (!shops) {
    shops = await db.subOrder.findMany({ where: { order: { number: o.number } }, select: { supplierId: true } })
      .then((subs) => db.supplier.findMany({ where: { id: { in: subs.map((s) => s.supplierId) } }, select: { displayName: true } }))
      .then((r) => r.map((s) => s.displayName), () => []);
  }
  await sendEmail({ to: o.to, ...buildOrderEmail({ ...o, shops }) });
}

/** Paiement reçu mais article épuisé entre-temps : aucune commande créée, remboursement intégral. */
export function buildStockRefundEmail(o: { to: string; locale: "fr" | "en"; fullName: string; item: string; amountCents: number; number: string }) {
  const fr = o.locale === "fr";
  const amount = new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(o.amountCents / 100);
  const hello = fr ? `Bonjour ${o.fullName},` : `Hello ${o.fullName},`;
  const body = fr
    ? `Nous sommes désolés : **${o.item}** n'est plus disponible. Votre commande n'a pas pu être créée et votre paiement de **${amount}** est intégralement remboursé (délai bancaire habituel : quelques jours).`
    : `We are sorry: **${o.item}** is no longer available. Your order could not be created and your payment of **${amount}** is fully refunded (usual bank delay: a few days).`;
  const title = fr ? "Votre paiement est remboursé" : "Your payment is refunded";
  const subject = fr ? `E póm ta’ — remboursement (${o.number})` : `E póm ta’ — refund (${o.number})`;
  const text = [hello, "", body.replace(/\*\*/g, ""), "", fr ? "Merci de votre compréhension." : "Thank you for your understanding."].join("\n");
  const html = renderEmailHtml({ locale: o.locale, title, orderNumber: o.number, paragraphs: [hello, body], notice: fr ? "Merci de votre compréhension." : "Thank you for your understanding." });
  return { subject, text, html };
}

export async function sendStockRefundEmail(o: Parameters<typeof buildStockRefundEmail>[0]): Promise<void> {
  await sendEmail({ to: o.to, ...buildStockRefundEmail(o) });
}