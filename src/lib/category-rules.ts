// Règles d'affichage par forme d'art (sans dépendance serveur : utilisable côté client).

export type SizeKind = "clothing" | "ring";

export type CategoryRule = {
  /** Jeu de tailles proposé (filtre et fiche) ; absent = pas de taille. */
  sizeKind?: SizeKind;
  /** Dimensions en cm affichées sur la fiche. */
  dimensions: boolean;
  /** Conseils d'entretien affichés sur la fiche. */
  care: boolean;
};

export const CATEGORY_RULES: Record<string, CategoryRule> = {
  peinture: { dimensions: true, care: false },
  sculpture: { dimensions: true, care: false },
  "couture-mode": { sizeKind: "clothing", dimensions: false, care: true },
  bijoux: { dimensions: false, care: false }, // slug technique conservé : libellé « Accessoires »
  "textile-decoration": { dimensions: false, care: false },
  photographie: { dimensions: true, care: false },
};

const NO_RULE: CategoryRule = { dimensions: false, care: false };
export const ruleFor = (categorySlug: string | undefined): CategoryRule =>
  (categorySlug && CATEGORY_RULES[categorySlug]) || NO_RULE;

/** Valeurs de taille proposées dans les filtres, par jeu. Tour de doigt : taille FR (circonférence en mm − 40). */
export const SIZE_OPTIONS: Record<SizeKind, string[]> = {
  clothing: ["S", "M", "L"],
  ring: ["48", "50", "52", "54", "56", "58", "60"],
};

/** Clé de filtre stable (indépendante de la langue) dérivée d'un libellé. */
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
