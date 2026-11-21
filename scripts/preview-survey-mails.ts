import { writeFileSync } from "node:fs";
import { renderEmailHtml } from "../src/lib/email-layout";

const out = process.argv[2];
const item = { name: "Boubou brodé indigo", detail: "× 1 · M", priceLabel: "120,00 €" };
const base = { locale: "fr" as const, orderNumber: "AM-8B4A753C-1", summary: { items: [item], rows: [{ label: "Sous-total", value: "120,00 €", bold: true }] }, notice: "Vendu et expédié par Mimi Atelier." };
const avis = { label: "Donner mon avis", url: "https://epomta.com/fr/avis/abc" };
const cmd = { label: "Voir ma commande", url: "https://epomta.com/fr/account/orders/AM-8B4A753C-1" };
const files: Record<string, string> = {
  "mail-avis-j3.html": renderEmailHtml({ ...base, title: "Votre avis compte", paragraphs: ["Bonjour Awa,", "Votre commande AM-8B4A753C-1 est arrivée il y a quelques jours. Quelques questions seulement : votre avis nous aide à améliorer l'expérience."], cta: avis, secondaryCta: cmd }),
  "mail-cloture-avec-bouton.html": renderEmailHtml({ ...base, title: "Votre commande est clôturée", paragraphs: ["Bonjour Awa,", "Votre commande AM-8B4A753C-1 est désormais clôturée. Merci de votre confiance."], cta: avis, secondaryCta: cmd }),
  "mail-cloture-deja-repondu.html": renderEmailHtml({ ...base, title: "Votre commande est clôturée", paragraphs: ["Bonjour Awa,", "Votre commande AM-8B4A753C-1 est désormais clôturée. Merci de votre confiance.", "**Merci pour votre avis.**"], cta: cmd }),
};
for (const [n, h] of Object.entries(files)) writeFileSync(`${out}/${n}`, h);
