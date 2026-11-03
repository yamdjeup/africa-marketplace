/** Créateurs des pièces « Exemple » (démo privée). Exclus des listes et pages artistes. */
export const EXAMPLE_CREATOR_SLUGS = ["imane-ayissi", "ldm-look-different-marque", "loza-maleombho", "exemple"];

export const isExampleCreator = (slug: string) => EXAMPLE_CREATOR_SLUGS.includes(slug);

/** Une pièce d'exemple se reconnaît à son slug. */
export const isExampleProduct = (slug: string) => slug.startsWith("exemple-");
