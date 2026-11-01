import type { Bilingual, CategorySlug, Product } from "./types";

type Pair = [fr: string, en: string];

type ArtworkInput = {
  slug: string;
  file: string;
  name: Pair;
  description: Pair;
  story: Pair;
  category: CategorySlug;
  /** Prix fictif de démonstration, en EUR. */
  eur: number;
  materials: Pair[];
  dimensions?: string;
  creatorSlug: string;
};

function build(input: ArtworkInput): Product {
  const materials: Bilingual[] = input.materials.map(([fr, en]) => ({ fr, en }));
  return {
    slug: input.slug,
    name: input.name[0],
    nameEn: input.name[1],
    description: input.description[0],
    descriptionEn: input.description[1],
    story: input.story[0],
    storyEn: input.story[1],
    category: input.category,
    priceCents: input.eur * 100,
    materials,
    sizes: [],
    dimensions: input.dimensions,
    stock: 1,
    images: [`/images/artworks/${input.file}.jpg`],
    creatorSlug: input.creatorSlug,
  };
}

const CELANIE_TECH: Pair = ["Acrylique, café, graphite sur papier Arches", "Acrylic, coffee, graphite on Arches paper"];
const CELANIE_SERIES: Pair = [
  "Œuvre de la série « Carte d'identité » d'Aurélie-Victoire Célanie, présentée lors de G3A Visual Arts 2026.",
  "Work from Aurélie-Victoire Célanie's “Carte d'identité” series, shown at G3A Visual Arts 2026.",
];
const TAYLOR_TECH: Pair = ["Tirage photographique sur Dibond", "Photographic print on Dibond"];
const TAYLOR_SERIES: Pair = [
  "Œuvre de la série « Instants habités » de Cruzz Taylor, présentée lors de G3A Visual Arts 2026.",
  "Work from Cruzz Taylor's “Instants habités” series, shown at G3A Visual Arts 2026.",
];
const TAYLOR_SIZE = "60 × 90 cm";
const PAINTING: Pair = ["Peinture", "Painting"];
const CERAMIC: Pair = ["Céramique", "Ceramics"];

const inputs: ArtworkInput[] = [
  {
    slug: "kwame",
    file: "celanie-3",
    name: ["Kwame", "Kwame"],
    description: [
      "Profil de tête dont le contour est rempli d'une trame de petites silhouettes, sur fond noir. Cadre bois clair.",
      "Profile of a head whose outline is filled with a pattern of tiny silhouettes, on a black ground. Light wood frame.",
    ],
    story: CELANIE_SERIES,
    category: "dessin",
    eur: 1800,
    materials: [CELANIE_TECH],
    dimensions: "56 × 76 cm (2026)",
    creatorSlug: "aurelie-victoire-celanie",
  },
  {
    slug: "figure-chevelure-blanche",
    file: "celanie-1",
    name: ["Figure à la chevelure blanche", "Figure with white hair"],
    description: [
      "Portrait frontal dont la chevelure et le buste se couvrent peu à peu de silhouettes, sur un fond noir quadrillé de croix.",
      "Frontal portrait whose hair and bust gradually fill with silhouettes, on a black ground gridded with crosses.",
    ],
    story: CELANIE_SERIES,
    category: "dessin",
    eur: 1800,
    materials: [CELANIE_TECH],
    creatorSlug: "aurelie-victoire-celanie",
  },
  {
    slug: "figure-aux-palmiers",
    file: "celanie-2",
    name: ["Figure aux palmiers", "Figure with palm trees"],
    description: [
      "Buste composé d'une trame de silhouettes devant un paysage nocturne de palmiers, sur un fond quadrillé.",
      "Bust made of a pattern of silhouettes in front of a nocturnal landscape of palm trees, on a gridded ground.",
    ],
    story: CELANIE_SERIES,
    category: "dessin",
    eur: 1800,
    materials: [CELANIE_TECH],
    creatorSlug: "aurelie-victoire-celanie",
  },
  {
    slug: "instants-habites-portrait-turban-perle",
    file: "taylor-1",
    name: ["Portrait de femme au turban perlé", "Portrait of a woman in a pearled turban"],
    description: [
      "Portrait d'une femme âgée coiffée d'un turban plissé orné de perles, sur fond sombre.",
      "Portrait of an older woman wearing a pleated turban adorned with pearls, on a dark ground.",
    ],
    story: TAYLOR_SERIES,
    category: "photographie",
    eur: 450,
    materials: [TAYLOR_TECH],
    dimensions: TAYLOR_SIZE,
    creatorSlug: "cruzz-taylor",
  },
  {
    slug: "instants-habites-portrait-veste-rayee",
    file: "taylor-2",
    name: ["Portrait d'homme en veste rayée", "Portrait of a man in a pinstripe jacket"],
    description: [
      "Portrait frontal et en gros plan d'un homme en veste à fines rayures, sur fond brun.",
      "Close-up frontal portrait of a man in a fine pinstripe jacket, on a brown ground.",
    ],
    story: TAYLOR_SERIES,
    category: "photographie",
    eur: 450,
    materials: [TAYLOR_TECH],
    dimensions: TAYLOR_SIZE,
    creatorSlug: "cruzz-taylor",
  },
  {
    slug: "instants-habites-portrait-enfant-riant",
    file: "taylor-3",
    name: ["Portrait d'enfant riant", "Portrait of a laughing child"],
    description: [
      "Portrait en gros plan d'un enfant éclatant de rire, sur un fond sombre aux reflets dorés.",
      "Close-up portrait of a child bursting into laughter, on a dark ground with golden highlights.",
    ],
    story: TAYLOR_SERIES,
    category: "photographie",
    eur: 450,
    materials: [TAYLOR_TECH],
    dimensions: TAYLOR_SIZE,
    creatorSlug: "cruzz-taylor",
  },
  {
    slug: "trois-reliefs-ceramique-blanche",
    file: "morere-1",
    name: ["Trois reliefs muraux en céramique blanche", "Three white ceramic wall reliefs"],
    description: [
      "Trio de pièces murales en céramique blanche, ornées de motifs floraux, de figures animales et de franges modelées.",
      "Trio of white ceramic wall pieces, decorated with floral motifs, animal figures and modelled fringes.",
    ],
    story: [
      "Ces formes semblent provenir d'une civilisation réelle ou imaginaire (Nathalie Morere, G3A Visual Arts 2026).",
      "These forms seem to come from a real or imaginary civilisation (Nathalie Morere, G3A Visual Arts 2026).",
    ],
    category: "sculpture-ceramique",
    eur: 1400,
    materials: [CERAMIC],
    creatorSlug: "nathalie-morere",
  },
  {
    slug: "sculpture-ceramique-vasque-bleue",
    file: "morere-2",
    name: ["Sculpture céramique à la vasque bleue", "Ceramic sculpture with a blue basin"],
    description: [
      "Pièce verticale en céramique : un visage en relief orne une vasque émaillée bleue, posée sur un corps à ailes plumées.",
      "Vertical ceramic piece: a relief face adorns a blue glazed basin set on a body with feathered wings.",
    ],
    story: [
      "Entre mémoire et transmission, une pièce qui interroge ce que nous conservons ou reconstruisons de nos héritages.",
      "Between memory and transmission, a piece that questions what we preserve or rebuild from our heritage.",
    ],
    category: "sculpture-ceramique",
    eur: 950,
    materials: [CERAMIC],
    creatorSlug: "nathalie-morere",
  },
  {
    slug: "grande-toile-masques-et-arbre",
    file: "kenof-1",
    name: ["Grande toile aux masques et au grand arbre", "Large canvas of masks and a great tree"],
    description: [
      "Vaste composition peinte : masques, statues et figures s'assemblent au pied d'un arbre aux racines monumentales, sur un fond de motifs.",
      "Vast painted composition: masks, statues and figures gather at the foot of a tree with monumental roots, against a patterned ground.",
    ],
    story: [
      "Une œuvre qui met en relation mémoire, spiritualité et héritage bamiléké (KeNoF, G3A Visual Arts 2026).",
      "A work that connects memory, spirituality and Bamileke heritage (KeNoF, G3A Visual Arts 2026).",
    ],
    category: "peinture",
    eur: 6500,
    materials: [PAINTING],
    creatorSlug: "kenof",
  },
  {
    slug: "scene-de-chambre-oiseau-noir",
    file: "padua-1",
    name: ["Scène de chambre à l'oiseau noir", "Bedroom scene with a black bird"],
    description: [
      "Une femme alitée, un homme de dos en pantalon camouflage, un nouveau-né emmailloté au visage d'adulte et un grand oiseau noir.",
      "A woman in bed, a man seen from behind in camouflage trousers, a swaddled newborn with an adult's face and a large black bird.",
    ],
    story: [
      "Peinture figurative qui prolonge les questions de métissage et de regard social chères à Paula Padua Nogueira.",
      "Figurative painting that extends Paula Padua Nogueira's concerns with mixed heritage and the social gaze.",
    ],
    category: "peinture",
    eur: 3800,
    materials: [PAINTING],
    creatorSlug: "paula-padua-nogueira",
  },
  {
    slug: "trois-figures-et-nuancier-capillaire",
    file: "padua-2",
    name: ["Trois figures et nuancier capillaire", "Three figures and a hair-type chart"],
    description: [
      "Trois jeunes femmes de profil devant une classification des types de cheveux et un arbre généalogique de métissage.",
      "Three young women in profile in front of a hair-type classification and a mixed-heritage family tree.",
    ],
    story: [
      "Une peinture qui aborde le colorisme, les standards de beauté et la mémoire coloniale (Paula Padua Nogueira, G3A Visual Arts 2026).",
      "A painting that addresses colourism, beauty standards and colonial memory (Paula Padua Nogueira, G3A Visual Arts 2026).",
    ],
    category: "peinture",
    eur: 4200,
    materials: [PAINTING],
    creatorSlug: "paula-padua-nogueira",
  },
  {
    slug: "femme-enceinte-et-ane-rieur",
    file: "padua-3",
    name: ["Femme enceinte et âne rieur", "Pregnant woman and laughing donkey"],
    description: [
      "Une femme enceinte en robe ornée de cages à oiseaux fait face à un homme qui lit ; un âne rieur observe depuis un paysage industriel au crépuscule.",
      "A pregnant woman in a dress patterned with bird cages faces a man who is reading; a laughing donkey watches from an industrial landscape at dusk.",
    ],
    story: [
      "Une scène onirique où se croisent héritages et regards (Paula Padua Nogueira, G3A Visual Arts 2026).",
      "A dreamlike scene where heritages and gazes cross (Paula Padua Nogueira, G3A Visual Arts 2026).",
    ],
    category: "peinture",
    eur: 3400,
    materials: [PAINTING],
    creatorSlug: "paula-padua-nogueira",
  },
];

export const products: Product[] = inputs.map(build);
