import { sendEmail } from "@/lib/email";

export type OrderEmailInput = {
  to: string;
  locale: "fr" | "en";
  number: string;
  fullName: string;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  totalCents: number;
  shipping?: { lines: string[]; phone: string; editUrl?: string };
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildOrderEmail(o: OrderEmailInput) {
  const fr = o.locale === "fr";
  const money = (cents: number) =>
    new Intl.NumberFormat(fr ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(cents / 100);
  const t = fr
    ? {
        subject: `E póm ta’ — confirmation de la commande ${o.number} (simulée)`,
        hello: `Bonjour ${o.fullName},`,
        intro: "Merci pour votre commande sur E póm ta’.",
        notice: "Commande simulée, aucun paiement n'a été effectué.",
        num: "Numéro de commande",
        works: "Œuvres",
        total: "Total",
        shipTo: "Adresse de livraison",
        phone: "Téléphone",
        mistake: "Une erreur ? Modifiez l'adresse tant que la commande n'est pas expédiée, ou contactez-nous.",
        edit: "Modifier l'adresse",
        bye: "Démonstration privée — prix fictifs de démonstration.",
      }
    : {
        subject: `E póm ta’ — order ${o.number} confirmation (simulated)`,
        hello: `Hello ${o.fullName},`,
        intro: "Thank you for your order on E póm ta’.",
        notice: "Simulated order, no payment has been made.",
        num: "Order number",
        works: "Artworks",
        total: "Total",
        shipTo: "Delivery address",
        phone: "Phone",
        mistake: "A mistake? Edit the address until the order has shipped, or contact us.",
        edit: "Edit address",
        bye: "Private demonstration — fictional demo prices.",
      };
  const lines = o.items.map((i) => `${i.name} × ${i.quantity} — ${money(i.unitPriceCents * i.quantity)}`);
  const ship = o.shipping;
  const shipText = ship
    ? ["", `${t.shipTo} :`, ...ship.lines, `${t.phone} : ${ship.phone}`, t.mistake, ...(ship.editUrl ? [`${t.edit} : ${ship.editUrl}`] : [])]
    : [];
  const shipHtml = ship
    ? `<p>${esc(t.shipTo)} :<br><strong>${ship.lines.map(esc).join("<br>")}</strong><br>${esc(t.phone)} : ${esc(ship.phone)}</p><p style="font-size:13px">${esc(t.mistake)}${
        ship.editUrl ? ` <a href="${esc(ship.editUrl)}">${esc(t.edit)}</a>` : ""
      }</p>`
    : "";
  const text = [t.hello, "", t.intro, t.notice, "", `${t.num} : ${o.number}`, `${t.works} :`, ...lines.map((l) => `- ${l}`), "", `${t.total} : ${money(o.totalCents)}`, ...shipText, "", t.bye].join("\n");
  const html = `<div style="font-family:Georgia,serif;color:#1c3060;background:#faf6ee;padding:24px;max-width:560px">
<h1 style="font-size:22px;margin:0 0 16px">E póm ta’</h1>
<p>${esc(t.hello)}</p><p>${esc(t.intro)}</p>
<p style="border-left:3px solid #eba941;padding-left:12px"><strong>${esc(t.notice)}</strong></p>
<p>${esc(t.num)} : <strong>${esc(o.number)}</strong></p>
<p>${esc(t.works)} :</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p><strong>${esc(t.total)} : ${esc(money(o.totalCents))}</strong></p>
${shipHtml}
<p style="font-size:12px;opacity:.7">${esc(t.bye)}</p></div>`;
  return { subject: t.subject, text, html };
}

// Ne lève jamais : une commande ne doit pas échouer à cause de l'e-mail.
export async function sendOrderEmail(o: OrderEmailInput): Promise<void> {
  await sendEmail({ to: o.to, ...buildOrderEmail(o) });
}
