/** Destinataire des e-mails partenaire : e-mail de contact du profil, sinon e-mail du compte (connexion inchangée). */
export function partnerRecipient(supplier: { contactEmail?: string | null }, accountEmail?: string | null): string | null {
  return supplier.contactEmail?.trim() || accountEmail?.trim() || null;
}
