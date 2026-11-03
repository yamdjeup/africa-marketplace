import type { Creator, Product } from "./types";

// Jeu d'exemple SÉPARÉ du seed principal (voir scripts/seed-examples.ts et prisma/seed.examples*.sql).
// Pièces et créateur fictifs, uniquement pour essayer le Miroir. Visuels : scripts/generate-examples.py.
export const exampleCreator: Creator = {
  slug: "exemple",
  name: "Exemple",
  specialty: "Pièces d'exemple (essayage)",
  specialtyEn: "Sample pieces (try-on)",
  bio: "Créateur fictif : ces pièces servent uniquement à démontrer l'essayage au Miroir.",
  bioEn: "Fictional creator: these pieces only demonstrate the Mirror try-on.",
  image: "/images/examples/collier.png",
  sourceUrl: "",
};

const common = {
  materials: [] as Product["materials"],
  hasCertificate: false,
  stock: 1,
  creatorSlug: "exemple",
};

export const exampleProducts: Product[] = [
  {
    ...common,
    slug: "exemple-boucles-anneau-goutte",
    name: "Boucles d'oreilles anneau et goutte (Exemple)",
    nameEn: "Hoop and drop earrings (Example)",
    description: "Pièce d'exemple fictive pour essayer les boucles d'oreilles au Miroir.",
    descriptionEn: "Fictional sample piece to try earrings in the Mirror.",
    story: "Exemple : cette pièce n'existe pas ; elle illustre l'essayage par caméra.",
    storyEn: "Example: this piece does not exist; it illustrates the camera try-on.",
    category: "bijoux",
    priceCents: 6500,
    sizes: [],
    materials: [{ fr: "Métal doré, résine (exemple)", en: "Gold-tone metal, resin (example)" }],
    material: { fr: "Métal doré", en: "Gold-tone metal" },
    images: ["/images/examples/boucle.png"],
  },
  {
    ...common,
    slug: "exemple-collier-perles-pendentif",
    name: "Collier de perles et pendentif (Exemple)",
    nameEn: "Beaded necklace with pendant (Example)",
    description: "Pièce d'exemple fictive pour essayer un collier au Miroir.",
    descriptionEn: "Fictional sample piece to try a necklace in the Mirror.",
    story: "Exemple : cette pièce n'existe pas ; elle illustre l'essayage par caméra.",
    storyEn: "Example: this piece does not exist; it illustrates the camera try-on.",
    category: "bijoux",
    priceCents: 8900,
    sizes: [],
    materials: [{ fr: "Perles de verre (exemple)", en: "Glass beads (example)" }],
    material: { fr: "Perles de verre", en: "Glass beads" },
    images: ["/images/examples/collier.png"],
  },
  {
    ...common,
    slug: "exemple-haut-bandes-kente",
    name: "Haut à bandes façon kente (Exemple)",
    nameEn: "Kente-style striped top (Example)",
    description: "Pièce d'exemple fictive pour essayer un haut au Miroir.",
    descriptionEn: "Fictional sample piece to try a top in the Mirror.",
    story: "Exemple : cette pièce n'existe pas ; elle illustre l'essayage par caméra.",
    storyEn: "Example: this piece does not exist; it illustrates the camera try-on.",
    category: "couture-mode",
    priceCents: 12000,
    sizes: ["S", "M", "L"],
    materials: [{ fr: "Coton (exemple)", en: "Cotton (example)" }],
    material: { fr: "Coton", en: "Cotton" },
    careInstructions: { fr: "Exemple : lavage à 30 °C.", en: "Example: wash at 30 °C." },
    images: ["/images/examples/haut.png"],
  },
];
