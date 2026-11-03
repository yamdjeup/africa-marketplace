type Country = { key: string; fr: string; en: string };

const CM: Country = { key: "cameroun", fr: "Cameroun", en: "Cameroon" };
const BJ: Country = { key: "benin", fr: "Bénin", en: "Benin" };
const CD: Country = { key: "rd-congo", fr: "RD Congo", en: "DR Congo" };
const NG: Country = { key: "nigeria", fr: "Nigeria", en: "Nigeria" };
const CI: Country = { key: "cote-d-ivoire", fr: "Côte d'Ivoire", en: "Ivory Coast" };
const GP: Country = { key: "guadeloupe", fr: "Guadeloupe", en: "Guadeloupe" };

// Pays normalisés par artiste (un ou plusieurs), utilisés pour le filtre « Pays ».
export const CREATOR_COUNTRIES: Record<string, Country[]> = {
  "aurelie-victoire-celanie": [GP],
  kenof: [CM],
  "nathalie-morere": [CM, BJ],
  "cruzz-taylor": [CD],
  "paula-padua-nogueira": [CD],
  "imane-ayissi": [CM],
  "ldm-look-different-marque": [NG],
  "loza-maleombho": [CI],
};
