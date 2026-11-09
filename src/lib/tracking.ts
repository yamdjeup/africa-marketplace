export const CARRIERS = ["UPS", "DHL", "Colissimo"] as const;

const BUILDERS: [RegExp, (n: string) => string][] = [
  [/ups/i, (n) => `https://www.ups.com/track?tracknum=${n}`],
  [/dhl/i, (n) => `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${n}`],
  [/colissimo|la\s*poste/i, (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${n}`],
];

/** URL de suivi du transporteur (lien uniquement, aucun appel externe) ; null si transporteur inconnu. */
export function trackingUrl(carrier: string, trackingNumber: string): string | null {
  const n = encodeURIComponent(trackingNumber.trim());
  if (!n) return null;
  const b = BUILDERS.find(([re]) => re.test(carrier));
  return b ? b[1](n) : null;
}
