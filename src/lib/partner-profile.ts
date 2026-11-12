export type PartnerContact = { contactEmail: string; phone: string; address: string };
export type ContactError = "email" | "phone" | "address";

/** Valide les coordonnées d'un partenaire (champs facultatifs, mais corrects s'ils sont remplis). */
export function validateContact(c: PartnerContact): ContactError | null {
  if (c.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail)) return "email";
  if (c.phone && !(/^\+?[\d\s().-]{6,20}$/.test(c.phone) && (c.phone.match(/\d/g) ?? []).length >= 6)) return "phone";
  if (c.address.length > 300) return "address";
  return null;
}

export const CONTACT_ERRORS: Record<ContactError, [string, string]> = {
  email: ["E-mail de contact invalide.", "Invalid contact email."],
  phone: ["Numéro de téléphone invalide (chiffres, +, espaces).", "Invalid phone number (digits, +, spaces)."],
  address: ["Adresse trop longue (300 caractères maximum).", "Address too long (300 characters max)."],
};

/** Noms des champs modifiés. */
export function changedFields<T extends Record<string, unknown>>(before: T, after: T): string[] {
  return Object.keys(after).filter((k) => (before[k] ?? "") !== (after[k] ?? ""));
}

/** Lignes d'audit « champ : ancienne → nouvelle valeur » (valeurs tronquées à 120 caractères). */
export function changeLog<T extends Record<string, unknown>>(before: T, after: T): string {
  const v = (x: unknown) => String(x ?? '').replace(/\s+/g, ' ').slice(0, 120) || '∅';
  return changedFields(before, after).map((k) => `${k} : ${v(before[k])} → ${v(after[k])}`).join(' | ');
}
