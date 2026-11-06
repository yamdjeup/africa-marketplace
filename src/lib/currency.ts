// Devises acceptées pour la saisie du prix par les partenaires. Le catalogue public reste affiché en EUR :
// le prix EUR (priceCents) est calculé avec ces taux indicatifs (XOF/XAF : parité fixe avec l'euro).
export const CURRENCIES = ["EUR", "XOF", "XAF", "USD", "GBP", "GHS", "NGN"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Unités de la devise pour 1 EUR (indicatif). */
export const RATES: Record<Currency, number> = { EUR: 1, XOF: 655.957, XAF: 655.957, USD: 1.08, GBP: 0.85, GHS: 16, NGN: 1600 };
/** Décimales de l'unité mineure (XOF/XAF : pas de centimes). */
const DECIMALS: Record<Currency, number> = { EUR: 2, XOF: 0, XAF: 0, USD: 2, GBP: 2, GHS: 2, NGN: 2 };

export const isCurrency = (v: string): v is Currency => (CURRENCIES as readonly string[]).includes(v);

/** « 12,5 » en devise -> unités mineures. */
export function toMinor(amount: number, c: Currency) {
  return Math.round(amount * 10 ** DECIMALS[c]);
}
export function fromMinor(minor: number, c: Currency) {
  return minor / 10 ** DECIMALS[c];
}
/** Montant en unités mineures de la devise -> centimes d'EUR. */
export function toEurCents(minor: number, c: Currency) {
  return Math.round((fromMinor(minor, c) / RATES[c]) * 100);
}
export function formatLocal(minor: number, c: Currency, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: c, maximumFractionDigits: DECIMALS[c] }).format(fromMinor(minor, c));
}
