const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+|00)?\d(?:[\s.()-]?\d){7,}/g;

/** Masque e-mails et numéros de téléphone avant tout envoi au modèle. */
export function maskPersonalData(text: string): string {
  return text.replace(EMAIL, "[e-mail masqué]").replace(PHONE, "[numéro masqué]");
}
