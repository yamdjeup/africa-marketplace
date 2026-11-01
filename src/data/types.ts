/**
 * Types des données fictives du POC. Ils reflètent le futur schéma Prisma
 * (Creator, Product, Category) : champs bilingues FR/EN, prix en centimes EUR.
 * Toutes les données sont 100 % fictives.
 */

export type CategorySlug =
  | "couture"
  | "bijoux"
  | "sculpture"
  | "peinture"
  | "textile"
  | "decoration";

export type CurrencyCode = "XOF" | "XAF" | "GHS" | "NGN" | "KES";

export type Bilingual = { fr: string; en: string };

export type Category = {
  slug: CategorySlug;
  name: string;
  nameEn: string;
};

export type Creator = {
  slug: string;
  /** Nom de l'atelier (fictif). */
  name: string;
  country: string;
  countryEn: string;
  city: string;
  specialty: string;
  specialtyEn: string;
  bio: string;
  bioEn: string;
  /** Chemin public d'un placeholder SVG généré localement. */
  image: string;
};

export type LocalPrice = {
  currency: CurrencyCode;
  /** Montant indicatif (non contractuel), en unités entières de la devise. */
  amount: number;
};

export type Product = {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** Histoire de la pièce. */
  story: string;
  storyEn: string;
  category: CategorySlug;
  /** Prix en centimes d'EUR (devise de facturation du POC). */
  priceCents: number;
  /** Équivalent indicatif en devise locale, affiché à titre informatif. */
  localPrice: LocalPrice;
  materials: Bilingual[];
  /** Tailles disponibles ; vide pour les pièces sans taille. */
  sizes: string[];
  /** Dimensions pour les pièces d'art et de décoration. */
  dimensions?: string;
  origin: { country: string; countryEn: string; city: string };
  stock: number;
  /** Chemins publics de placeholders SVG générés localement. */
  images: string[];
  creatorSlug: string;
};
