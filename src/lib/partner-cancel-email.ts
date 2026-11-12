import { renderEmailHtml } from "@/lib/email-layout";

/** E-mail au partenaire quand son colis est annulé par l'admin ou expiré (48 h). Pur : testable. */
export function buildPartnerCancelEmail(o: { shop: string; number: string; reason: string; kind: "ADMIN" | "EXPIRED"; url: string; amount: string }) {
  const why = o.kind === "ADMIN" ? `Le colis a été annulé par l'administration. Motif : ${o.reason || "non précisé"}.` : "Sans réponse sous 48 h, le colis a été annulé automatiquement.";
  const hello = `Bonjour ${o.shop},`;
  const subject = `E póm ta’ — colis ${o.number} annulé`;
  const lines = [hello, `Colis ${o.number} (${o.amount}).`, why, "Le stock réservé est libéré ; aucune expédition n'est à prévoir.", o.url];
  const html = renderEmailHtml({
    locale: "fr",
    title: "Un colis est annulé",
    orderNumber: o.number,
    paragraphs: [hello, `**Colis ${o.number}** — ${o.amount}`, why, "Le stock réservé est libéré ; aucune expédition n'est à prévoir."],
    cta: { label: "Voir la commande", url: o.url },
  });
  return { subject, lines, html };
}
