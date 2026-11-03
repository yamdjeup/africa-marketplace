// Pays principal normalisé par artiste (un seul, sans ville), utilisé pour le sous-titre « Discipline · Pays » et le filtre.
// Absent = pays non renseigné (non affiché, hors filtre).
export const CREATOR_COUNTRY: Record<string, { key: string; fr: string; en: string }> = {
  "aurelie-victoire-celanie": { key: "guadeloupe", fr: "Guadeloupe", en: "Guadeloupe" },
  kenof: { key: "cameroun", fr: "Cameroun", en: "Cameroon" },
  "imane-ayissi": { key: "cameroun", fr: "Cameroun", en: "Cameroon" },
  "ldm-look-different-marque": { key: "nigeria", fr: "Nigeria", en: "Nigeria" },
  "loza-maleombho": { key: "cote-d-ivoire", fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
};
