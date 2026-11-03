import type { Creator, Product } from "./types";

// Jeu d'exemple SÉPARÉ du seed principal (voir prisma/seed.examples.ts et prisma/seed.examples*.sql).
// Pièces de démonstration : prix, tailles et stock fictifs. Visuels protégés (démo privée uniquement, voir docs/BACKLOG.md).
// Ces créateurs ne sont jamais listés dans « Nos artistes » ni sur /createurs (voir src/lib/examples.ts).
export const exampleCreators: Creator[] = [
  {
    slug: "imane-ayissi",
    name: "Imane Ayissi",
    specialty: "Couturier, Cameroun (Paris)",
    specialtyEn: "Couturier, Cameroon (Paris)",
    bio: "Né au Cameroun, ancien danseur du Ballet national, Imane Ayissi vit à Paris depuis les années 1990. Sa maison de haute couture puise dans les fibres naturelles, les tissages et les teintures végétales du continent africain, et présente ses collections à la Fashion Week de haute couture parisienne depuis 2020.",
    bioEn: "Born in Cameroon and a former dancer with the National Ballet, Imane Ayissi has lived in Paris since the 1990s. His couture house draws on natural fibres, weaving and plant dyes from across Africa, and has shown at Paris Haute Couture Week since 2020.",
    image: "/images/examples/veste-tiedye.webp",
    sourceUrl: "https://imane-ayissi.com/en/pages/la-maison",
  },
  {
    slug: "ldm-look-different-marque",
    name: "LDM (Look Different Marque)",
    specialty: "Maison de mode, Lagos, Nigeria",
    specialtyEn: "Fashion house, Lagos, Nigeria",
    bio: "Fondée en 2021 par Munachimso Okolo, LDM est une marque nigériane contemporaine. Les tissus sont choisis dans le monde entier et chaque pièce, sur mesure ou prêt-à-porter, est confectionnée dans l'atelier de Lagos.",
    bioEn: "Founded in 2021 by Munachimso Okolo, LDM is a contemporary Nigerian brand. Fabrics are sourced worldwide and every piece, bespoke or ready-to-wear, is made in the Lagos fashion house.",
    image: "/images/examples/veste-verte-portee.webp",
    sourceUrl: "https://ldmclo.com/about-us/",
  },
  {
    slug: "loza-maleombho",
    name: "Lozama Leombho",
    specialty: "Créatrice de mode, Côte d'Ivoire / États-Unis",
    specialtyEn: "Fashion designer, Côte d'Ivoire / United States",
    bio: "Née au Brésil en 1985 et élevée entre la Côte d'Ivoire et les États-Unis, Loza Maléombho est diplômée en animation. Elle réinterprète les récits et l'artisanat d'Afrique de l'Ouest en silhouettes sculpturales et géométriques, à la croisée de la mode, de l'image et des nouvelles technologies.",
    bioEn: "Born in Brazil in 1985 and raised between Côte d'Ivoire and the United States, Loza Maléombho trained in animation. She reinterprets West African stories and craftsmanship in sculptural, geometric silhouettes, at the crossroads of fashion, image and new technologies.",
    image: "/images/examples/ceinture-cuir.webp",
    sourceUrl: "https://www.lozamaleombho.com/about",
  },
];

// Anciens exemples retirés : nettoyés à l'ajout et au retrait.
export const legacyExampleSlugs = [
  "exemple-haut-bandes-kente",
  "exemple-boucles-anneau-goutte",
  "exemple-collier-perles-pendentif",
  "exemple-haut-toile-cuir",
  "exemple-ceinture-cuir-poches",
  "exemple-veste-longue-tie-dye",
  "exemple-veste-verte-chevrons",
];
export const legacyExampleCreatorSlugs = ["exemple"];

const common = {
  materials: [] as Product["materials"],
  hasCertificate: false,
  stock: 1,
  category: "couture-mode" as const,
  sizes: ["S", "M", "L"],
};

export const exampleProducts: Product[] = [
  {
    ...common,
    slug: "exemple-imane-ayissi-veste-tie-dye",
    creatorSlug: "imane-ayissi",
    name: "Veste longue tie-dye noir et blanc (Exemple)",
    nameEn: "Long black-and-white tie-dye jacket (Example)",
    description: "Pièce de démonstration : veste longue à motif tie-dye noir et blanc, col châle.",
    descriptionEn: "Demo piece: long black-and-white tie-dye jacket with a shawl collar.",
    story: "Exemple : pièce de démonstration, non vendue ; le prix est fictif.",
    storyEn: "Example: demo piece, not for sale; the price is fictitious.",
    priceCents: 38000,
    materials: [{ fr: "Coton (exemple)", en: "Cotton (example)" }],
    material: { fr: "Coton", en: "Cotton" },
    careInstructions: { fr: "Exemple : lavage à la main, à l'envers, à froid.", en: "Example: hand wash inside out, cold." },
    images: ["/images/examples/veste-tiedye.webp"],
  },
  {
    ...common,
    slug: "exemple-ldm-hao-set",
    creatorSlug: "ldm-look-different-marque",
    name: "Hao Set, veste ajustée verte à chevrons (Exemple)",
    nameEn: "Hao Set, fitted green herringbone jacket (Example)",
    description: "Pièce de démonstration : veste ajustée à col en V, fermée par trois sangles à boucles.",
    descriptionEn: "Demo piece: fitted V-neck jacket closed with three buckled straps.",
    story: "Exemple : pièce de démonstration, non vendue ; photo portée, sans essayage au Miroir ; le prix est fictif.",
    storyEn: "Example: demo piece, not for sale; worn photo, no Mirror try-on; the price is fictitious.",
    priceCents: 42000,
    materials: [{ fr: "Tissu à chevrons (exemple)", en: "Herringbone fabric (example)" }],
    material: { fr: "Tissu à chevrons", en: "Herringbone fabric" },
    careInstructions: { fr: "Exemple : nettoyage à sec uniquement.", en: "Example: dry clean only." },
    images: ["/images/examples/veste-verte-portee.webp"],
  },
  {
    ...common,
    slug: "exemple-lozama-akara-belt",
    creatorSlug: "loza-maleombho",
    name: "Akara Belt, ceinture-corset en cuir (Exemple)",
    nameEn: "Akara Belt, leather corset belt (Example)",
    description: "Pièce de démonstration : ceinture-corset large en cuir à poches, portée à la taille.",
    descriptionEn: "Demo piece: wide leather corset belt with pockets, worn at the waist.",
    story: "Exemple : pièce de démonstration, non vendue ; le prix est fictif.",
    storyEn: "Example: demo piece, not for sale; the price is fictitious.",
    priceCents: 21000,
    materials: [{ fr: "Cuir (exemple)", en: "Leather (example)" }],
    material: { fr: "Cuir", en: "Leather" },
    careInstructions: { fr: "Exemple : essuyer avec un chiffon doux, éviter l'eau.", en: "Example: wipe with a soft cloth, avoid water." },
    images: ["/images/examples/ceinture-cuir.webp"],
  },
  {
    ...common,
    slug: "exemple-lozama-neitha-harness",
    creatorSlug: "loza-maleombho",
    name: "Neitha Harness, haut toile et cuir (Exemple)",
    nameEn: "Neitha Harness, canvas and leather top (Example)",
    description: "Pièce de démonstration : haut en toile à bretelles de cuir et fermoir doré.",
    descriptionEn: "Demo piece: canvas top with leather straps and a gold clasp.",
    story: "Exemple : pièce de démonstration, non vendue ; le prix est fictif.",
    storyEn: "Example: demo piece, not for sale; the price is fictitious.",
    priceCents: 14500,
    materials: [{ fr: "Toile et cuir (exemple)", en: "Canvas and leather (example)" }],
    material: { fr: "Toile et cuir", en: "Canvas and leather" },
    careInstructions: { fr: "Exemple : nettoyage à sec ; cuir à entretenir avec un chiffon doux.", en: "Example: dry clean; wipe the leather with a soft cloth." },
    images: ["/images/examples/haut-toile-cuir.webp"],
  },
];
