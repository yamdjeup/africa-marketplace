/**
 * Types des données de la galerie (démonstration privée). Ils reflètent le schéma
 * Prisma (Creator = artiste, Product = œuvre) : champs bilingues FR/EN, prix en
 * centimes d'EUR. Les prix sont fictifs ; les biographies sont celles de G3A.
 */

export type CategorySlug = "peinture" | "photographie" | "sculpture-ceramique" | "dessin";

export type Bilingual = { fr: string; en: string };

export type Category = {
  slug: CategorySlug;
  name: string;
  nameEn: string;
};

export type Creator = {
  slug: string;
  /** Nom de l'artiste. */
  name: string;
  specialty: string;
  specialtyEn: string;
  /** Biographie officielle G3A (texte repris tel quel) et sa traduction. */
  bio: string;
  bioEn: string;
  /** Chemin public d'une de ses œuvres, utilisée comme visuel d'artiste. */
  image: string;
  /** Article G3A dont provient la biographie. */
  sourceUrl: string;
};

export type Product = {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** Contexte de l'œuvre (série, démarche). */
  story: string;
  storyEn: string;
  category: CategorySlug;
  /** Prix fictif de démonstration, en centimes d'EUR. */
  priceCents: number;
  /** Technique(s) : ex. « Acrylique, café, graphite sur papier Arches ». */
  materials: Bilingual[];
  /** Toujours vide : œuvres sans déclinaison de taille. */
  sizes: string[];
  dimensions?: string;
  /** Pièce unique : stock = 1. */
  stock: number;
  /** Chemins publics des photos de l'œuvre. */
  images: string[];
  creatorSlug: string;
};
