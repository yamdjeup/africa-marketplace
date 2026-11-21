export type Country = { key: string; fr: string; en: string };

const LIST: (Country & { alias?: string[] })[] = [
  { key: "cameroun", fr: "Cameroun", en: "Cameroon" },
  { key: "benin", fr: "Bénin", en: "Benin" },
  { key: "rd-congo", fr: "RD Congo", en: "DR Congo", alias: ["Congo (RDC)", "Democratic Republic of the Congo", "République démocratique du Congo", "Congo-Kinshasa"] },
  { key: "congo", fr: "Congo", en: "Congo", alias: ["Republic of the Congo", "Congo-Brazzaville"] },
  { key: "nigeria", fr: "Nigeria", en: "Nigeria" },
  { key: "cote-d-ivoire", fr: "Côte d'Ivoire", en: "Ivory Coast", alias: ["Cote d Ivoire", "Côte d’Ivoire", "Cote dIvoire"] },
  { key: "guadeloupe", fr: "Guadeloupe", en: "Guadeloupe" },
  { key: "senegal", fr: "Sénégal", en: "Senegal" },
  { key: "ghana", fr: "Ghana", en: "Ghana" },
  { key: "kenya", fr: "Kenya", en: "Kenya" },
  { key: "south-africa", fr: "Afrique du Sud", en: "South Africa" },
  { key: "morocco", fr: "Maroc", en: "Morocco" },
  { key: "tunisia", fr: "Tunisie", en: "Tunisia" },
  { key: "algeria", fr: "Algérie", en: "Algeria" },
  { key: "egypt", fr: "Égypte", en: "Egypt" },
  { key: "ethiopia", fr: "Éthiopie", en: "Ethiopia" },
  { key: "tanzania", fr: "Tanzanie", en: "Tanzania" },
  { key: "uganda", fr: "Ouganda", en: "Uganda" },
  { key: "rwanda", fr: "Rwanda", en: "Rwanda" },
  { key: "mali", fr: "Mali", en: "Mali" },
  { key: "burkina-faso", fr: "Burkina Faso", en: "Burkina Faso" },
  { key: "togo", fr: "Togo", en: "Togo" },
  { key: "gabon", fr: "Gabon", en: "Gabon" },
  { key: "madagascar", fr: "Madagascar", en: "Madagascar" },
  { key: "mauritius", fr: "Maurice", en: "Mauritius" },
  { key: "zimbabwe", fr: "Zimbabwe", en: "Zimbabwe" },
  { key: "zambia", fr: "Zambie", en: "Zambia" },
  { key: "angola", fr: "Angola", en: "Angola" },
  { key: "mozambique", fr: "Mozambique", en: "Mozambique" },
  { key: "namibia", fr: "Namibie", en: "Namibia" },
  { key: "botswana", fr: "Botswana", en: "Botswana" },
  { key: "sierra-leone", fr: "Sierra Leone", en: "Sierra Leone" },
  { key: "liberia", fr: "Liberia", en: "Liberia" },
  { key: "guinea", fr: "Guinée", en: "Guinea" },
  { key: "france", fr: "France", en: "France" },
  { key: "united-kingdom", fr: "Royaume-Uni", en: "United Kingdom", alias: ["UK", "England"] },
  { key: "united-states", fr: "États-Unis", en: "United States", alias: ["USA", "US"] },
  { key: "brazil", fr: "Brésil", en: "Brazil" },
  { key: "belgium", fr: "Belgique", en: "Belgium" },
  { key: "germany", fr: "Allemagne", en: "Germany" },
  { key: "italy", fr: "Italie", en: "Italy" },
  { key: "canada", fr: "Canada", en: "Canada" },
];

/** Clé de comparaison : sans accents, casse, apostrophes ni espaces. */
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const INDEX = new Map<string, Country>();
for (const c of LIST) for (const n of [c.key, c.fr, c.en, ...(c.alias ?? [])]) INDEX.set(norm(n), c);

export const COUNTRY_LIST: Country[] = LIST.map(({ key, fr, en }) => ({ key, fr, en }));

/** Pays canonique (une seule clé par pays, quelle que soit la saisie) ; inconnu → clé dérivée du nom. */
export function canonCountry(name: string, nameEn = name): Country {
  const hit = INDEX.get(norm(nameEn)) ?? INDEX.get(norm(name));
  if (hit) return { key: hit.key, fr: hit.fr, en: hit.en };
  const clean = nameEn.trim();
  return { key: norm(clean) || "autre", fr: name.trim() || clean, en: clean };
}
