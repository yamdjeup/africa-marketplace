import { sendEmail } from "@/lib/email";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";

export type OrderEmailInput = {
  to: string;
  locale: "fr" | "en";
  number: string;
  fullName: string;
  items: { name: string; quantity: number; size?: string | null; unitPriceCents: number; image?: string }[];
  totalCents: number;
  shipping?: { lines: string[]; phone: string; editUrl?: string };
};

export function buildOrderEmail(o: OrderEmailInput) {
  const fr = o.locale === "fr";
  const money = (cents: number) =>
    new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(cents / 100);
  const t = fr
    ? {
        subject: `E póm ta’ — confirmation de la commande ${o.number}`,
        hello: `Bonjour ${o.fullName},`,
        intro: "Merci pour votre commande sur E póm ta’.",
        notice: "Votre paiement par carte a bien été enregistré.",
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
        subject: `E póm ta’ — order ${o.number} confirmation`,
        hello: `Hello ${o.fullName},`,
        intro: "Thank you for your order on E póm ta’.",
        notice: "Your card payment has been recorded.",
        num: "Order number",
        works: "Creations",
        total: "Total",
        shipTo: "Delivery address",
        phone: "Phone",
        mistake: "A mistake? Edit the address until the order has shipped, or contact us.",
        edit: "Edit address",
        bye: "Thank you for your trust.",
      };
  const lines = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity} — ${money(i.unitPriceCents * i.quantity)}`);
  const ship = o.shipping;
  const shipText = ship
    ? ["", `${t.shipTo} :`, ...ship.lines, `${t.phone} : ${ship.phone}`, t.mistake, ...(ship.editUrl ? [`${t.edit} : ${ship.editUrl}`] : [])]
    : [];
  const text = [t.hello, "", t.intro, t.notice, "", `${t.num} : ${o.number}`, `${t.works} :`, ...lines.map((l) => `- ${l}`), "", `${t.total} : ${money(o.totalCents)}`, ...shipText, "", t.bye].join("\n");
  const html = renderEmailHtml({
    locale: o.locale,
    title: fr ? "Votre commande est bien reçue" : "Your order has been received",
    orderNumber: o.number,
    paragraphs: [t.hello, t.intro],
    cta: ship?.editUrl ? { label: t.edit, url: ship.editUrl } : undefined,
    summary: {
      items: o.items.map((i) => ({ name: i.name, detail: `× ${i.quantity}${i.size ? ` · ${i.size}` : ""}`, priceLabel: money(i.unitPriceCents * i.quantity), image: i.image ? absoluteImageUrl(i.image) : undefined })),
            rows: [{ label: fr ? "Livraison" : "Shipping", value: fr ? "Offerte" : "Free" }, { label: t.total, value: money(o.totalCents), bold: true }],
    },
    address: ship ? { title: t.shipTo, lines: [...ship.lines, `${t.phone} : ${ship.phone}`] } : undefined,
    notice: `**${t.notice}** ${ship ? t.mistake : ""} ${t.bye}`,
  });
  return { subject: t.subject, text, html };
}

// Ne lève jamais : une commande ne doit pas échouer à cause de l'e-mail.
export async function sendOrderEmail(o: OrderEmailInput): Promise<void> {
  await sendEmail({ to: o.to, ...buildOrderEmail(o) });
}
