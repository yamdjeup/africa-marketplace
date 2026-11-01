import { creators } from "./creators";
import type { Bilingual, CategorySlug, CurrencyCode, Product } from "./types";

type Pair = [fr: string, en: string];

type ProductInput = {
  slug: string;
  name: Pair;
  description: Pair;
  story: Pair;
  category: CategorySlug;
  eur: number;
  local: [currency: CurrencyCode, amount: number];
  materials: Pair[];
  sizes?: string[];
  dimensions?: string;
  creatorSlug: string;
  stock: number;
};

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"];

function build(input: ProductInput): Product {
  const creator = creators.find((c) => c.slug === input.creatorSlug);
  if (!creator) throw new Error(`Créateur inconnu : ${input.creatorSlug}`);
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
    localPrice: { currency: input.local[0], amount: input.local[1] },
    materials,
    sizes: input.sizes ?? [],
    dimensions: input.dimensions,
    origin: { country: creator.country, countryEn: creator.countryEn, city: creator.city },
    stock: input.stock,
    images: [`/images/products/${input.slug}-1.svg`, `/images/products/${input.slug}-2.svg`],
    creatorSlug: input.creatorSlug,
  };
}

const COTTON: Pair = ["Coton", "Cotton"];
const BRASS: Pair = ["Laiton", "Brass"];
const SILVER: Pair = ["Argent 925", "Sterling silver"];
const SISAL: Pair = ["Sisal", "Sisal"];

const inputs: ProductInput[] = [
  // Mali — Atelier Sahel Indigo
  {
    slug: "veste-bogolan-segou",
    name: ["Veste bogolan « Ségou »", "« Ségou » bogolan jacket"],
    description: [
      "Veste droite en coton teint à la boue, aux motifs géométriques ocre sur fond sombre, doublée de coton écru.",
      "Straight-cut jacket in mud-dyed cotton, with ochre geometric motifs on a dark ground, lined in raw cotton.",
    ],
    story: [
      "Le bogolan se compose par couches : teinture végétale, motifs peints à la boue fermentée, puis séchage au soleil. Cette pièce reprend cette patience dans une coupe contemporaine.",
      "Bogolan is built in layers: plant dye, motifs painted with fermented mud, then sun drying. This piece carries that patience into a contemporary cut.",
    ],
    category: "couture",
    eur: 280,
    local: ["XOF", 183700],
    materials: [["Coton tissé main", "Handwoven cotton"], ["Boue fermentée", "Fermented mud"], ["Teinture végétale", "Plant dye"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "atelier-sahel-indigo",
    stock: 6,
  },
  {
    slug: "plaid-bogolan-terre",
    name: ["Plaid bogolan « Terre »", "« Terre » bogolan throw"],
    description: [
      "Grand plaid en coton aux motifs bogolan en réserve, pour le canapé ou le pied du lit.",
      "Large cotton throw with resist-style bogolan motifs, made for the sofa or the foot of the bed.",
    ],
    story: [
      "Composé de bandes de coton tissées étroites puis cousues, ce plaid rappelle la manière dont les pagnes sont assemblés dans la région de Ségou.",
      "Made of narrow woven cotton strips sewn together, this throw recalls how cloths are assembled in the Ségou region.",
    ],
    category: "textile",
    eur: 145,
    local: ["XOF", 95100],
    materials: [COTTON, ["Teinture végétale", "Plant dye"]],
    dimensions: "130 × 180 cm",
    creatorSlug: "atelier-sahel-indigo",
    stock: 10,
  },
  {
    slug: "panneau-mural-bogolan",
    name: ["Panneau mural bogolan", "Bogolan wall panel"],
    description: [
      "Panneau de coton tendu sur châssis en bois, motifs en frise inspirés du bogolan, prêt à accrocher.",
      "Cotton panel stretched on a wooden frame, with frieze motifs inspired by bogolan, ready to hang.",
    ],
    story: [
      "Pensé comme une pièce d'art textile, il transpose en format mural les compositions rythmées du bogolan.",
      "Conceived as a piece of textile art, it brings the rhythmic compositions of bogolan to the wall.",
    ],
    category: "decoration",
    eur: 180,
    local: ["XOF", 118100],
    materials: [COTTON, ["Bois de karité", "Shea wood"]],
    dimensions: "60 × 90 cm",
    creatorSlug: "atelier-sahel-indigo",
    stock: 5,
  },
  {
    slug: "coussin-bogolan-sable",
    name: ["Coussin bogolan « Sable »", "« Sable » bogolan cushion"],
    description: [
      "Housse de coussin carrée en coton bogolan, fermeture dissimulée, garnissage non inclus.",
      "Square bogolan cotton cushion cover with a concealed closure, insert not included.",
    ],
    story: [
      "Né des chutes de l'atelier, ce coussin prolonge la vie des pièces plutôt que de les jeter.",
      "Made from the studio's offcuts, this cushion extends the life of the cloth rather than discarding it.",
    ],
    category: "decoration",
    eur: 65,
    local: ["XOF", 42600],
    materials: [COTTON],
    dimensions: "50 × 50 cm",
    creatorSlug: "atelier-sahel-indigo",
    stock: 20,
  },

  // Ghana — Maison Kumasi Weave
  {
    slug: "etole-kente-aurore",
    name: ["Étole kente « Aurore »", "« Aurore » kente stole"],
    description: [
      "Étole tissée en bandes de coton et de soie aux tons or, indigo et vert.",
      "Stole woven in strips of cotton and silk in gold, indigo and green tones.",
    ],
    story: [
      "Le kente se tisse en bandes étroites sur un métier à main ; les bandes sont ensuite assemblées bord à bord. Chaque agencement de couleurs peut porter une signification.",
      "Kente is woven in narrow strips on a handloom, then joined edge to edge. Each colour arrangement can carry a meaning.",
    ],
    category: "textile",
    eur: 190,
    local: ["GHS", 2500],
    materials: [COTTON, ["Soie", "Silk"]],
    dimensions: "40 × 200 cm",
    creatorSlug: "maison-kumasi-weave",
    stock: 8,
  },
  {
    slug: "veste-courte-kente",
    name: ["Veste courte en kente", "Cropped kente jacket"],
    description: [
      "Veste courte structurée, empiècements de kente sur une base de coton uni, boutons en bois.",
      "Structured cropped jacket with kente panels on a plain cotton base and wooden buttons.",
    ],
    story: [
      "La maison utilise le kente en empiècements mesurés, afin de mettre en valeur le tissage sans le découper à outrance.",
      "The house uses kente in measured panels, to showcase the weaving without over-cutting it.",
    ],
    category: "couture",
    eur: 360,
    local: ["GHS", 4700],
    materials: [["Kente (coton)", "Kente (cotton)"], COTTON, ["Bois", "Wood"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "maison-kumasi-weave",
    stock: 4,
  },
  {
    slug: "pochette-kente-or",
    name: ["Pochette kente « Or »", "« Gold » kente clutch"],
    description: [
      "Pochette du soir en kente doublée de coton, fermoir aimanté discret.",
      "Evening clutch in kente lined with cotton, with a discreet magnetic clasp.",
    ],
    story: [
      "Confectionnée à partir de bandes de tissage qui n'auraient pas suffi pour un vêtement.",
      "Made from woven strips too short to be used for a garment.",
    ],
    category: "couture",
    eur: 95,
    local: ["GHS", 1250],
    materials: [["Kente (coton)", "Kente (cotton)"], COTTON],
    dimensions: "24 × 14 cm",
    creatorSlug: "maison-kumasi-weave",
    stock: 12,
  },
  {
    slug: "collier-perles-recyclees",
    name: ["Collier de perles de verre recyclé", "Recycled glass bead necklace"],
    description: [
      "Collier multirang de perles de verre recyclé aux teintes indigo, ocre et vert, fermoir en laiton.",
      "Multi-strand necklace of recycled glass beads in indigo, ochre and green, with a brass clasp.",
    ],
    story: [
      "Inspiré des colliers de perles de verre du sud du Ghana, il est composé de perles issues de verre récupéré puis refondu.",
      "Inspired by the glass bead necklaces of southern Ghana, it uses beads made from reclaimed, re-melted glass.",
    ],
    category: "bijoux",
    eur: 85,
    local: ["GHS", 1100],
    materials: [["Verre recyclé", "Recycled glass"], BRASS],
    creatorSlug: "maison-kumasi-weave",
    stock: 15,
  },

  // Nigeria — Studio Adire Abeokuta
  {
    slug: "robe-adire-indigo",
    name: ["Robe adire indigo", "Indigo adire dress"],
    description: [
      "Robe mi-longue évasée en coton teint à l'indigo, motifs réservés par ligatures.",
      "Flared midi dress in indigo-dyed cotton with tie-resist patterns.",
    ],
    story: [
      "Chaque motif est obtenu en nouant ou cousant le tissu avant le bain d'indigo : aucune robe n'est strictement identique à une autre.",
      "Each pattern is made by tying or stitching the cloth before the indigo bath: no two dresses are exactly alike.",
    ],
    category: "couture",
    eur: 240,
    local: ["NGN", 408000],
    materials: [COTTON, ["Indigo naturel", "Natural indigo"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "studio-adire-abeokuta",
    stock: 7,
  },
  {
    slug: "coupe-tissu-adire-2m",
    name: ["Coupe de tissu adire (2 m)", "Adire fabric length (2 m)"],
    description: [
      "Deux mètres de coton adire, largeur 115 cm, à coudre ou à encadrer.",
      "Two metres of adire cotton, 115 cm wide, to sew or to frame.",
    ],
    story: [
      "La teinture à réserve s'est transmise de mère en fille dans de nombreuses familles d'Abeokuta ; cette coupe en perpétue l'esprit.",
      "Resist dyeing has been handed down in many Abeokuta families; this length carries on that spirit.",
    ],
    category: "textile",
    eur: 78,
    local: ["NGN", 132600],
    materials: [COTTON, ["Indigo naturel", "Natural indigo"]],
    dimensions: "200 × 115 cm",
    creatorSlug: "studio-adire-abeokuta",
    stock: 18,
  },
  {
    slug: "toile-eleko-nuit",
    name: ["Toile « Eleko de nuit »", "« Night Eleko » canvas"],
    description: [
      "Pièce unique sur toile, composition abstraite d'indigo et d'or inspirée des réserves à l'amidon.",
      "One-of-a-kind canvas: an abstract composition of indigo and gold inspired by starch-resist patterns.",
    ],
    story: [
      "L'artiste réinterprète l'adire eleko, où l'on appliquait une pâte d'amidon avant la teinture, comme un langage de formes à lire lentement.",
      "The artist reinterprets adire eleko, where starch paste was applied before dyeing, as a visual language to be read slowly.",
    ],
    category: "peinture",
    eur: 420,
    local: ["NGN", 714000],
    materials: [["Acrylique sur toile", "Acrylic on canvas"], ["Feuille d'or imitation", "Imitation gold leaf"]],
    dimensions: "80 × 100 cm",
    creatorSlug: "studio-adire-abeokuta",
    stock: 1,
  },
  {
    slug: "chemise-oversize-adire",
    name: ["Chemise oversize adire", "Oversized adire shirt"],
    description: [
      "Chemise ample en coton, col droit, motifs adire teints à la main, mixte.",
      "Roomy cotton shirt with a straight collar and hand-dyed adire patterns, unisex.",
    ],
    story: [
      "Pensée pour un quotidien actif, elle relie un geste artisanal ancien à une silhouette contemporaine.",
      "Designed for active everyday life, it joins an age-old craft gesture to a contemporary silhouette.",
    ],
    category: "couture",
    eur: 165,
    local: ["NGN", 280500],
    materials: [COTTON, ["Indigo naturel", "Natural indigo"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "studio-adire-abeokuta",
    stock: 9,
  },

  // Côte d'Ivoire — Atelier Wax Abidjan
  {
    slug: "robe-longue-wax-lagune",
    name: ["Robe longue wax « Lagune »", "« Lagune » long wax dress"],
    description: [
      "Robe longue cintrée, épaules structurées, imprimé wax bleu et ocre, doublure en coton.",
      "Fitted long dress with structured shoulders in blue and ochre wax print, cotton-lined.",
    ],
    story: [
      "Nommée d'après les lagunes d'Abidjan, elle marie la couleur du wax à une coupe de couture d'une grande sobriété.",
      "Named after Abidjan's lagoons, it pairs the colour of wax print with a very restrained tailored cut.",
    ],
    category: "couture",
    eur: 320,
    local: ["XOF", 209900],
    materials: [["Coton imprimé type wax", "Wax-style printed cotton"], ["Doublure coton", "Cotton lining"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "atelier-wax-abidjan",
    stock: 5,
  },
  {
    slug: "blazer-wax-plateau",
    name: ["Blazer wax « Plateau »", "« Plateau » wax blazer"],
    description: [
      "Blazer croisé en coton imprimé, boutons en corne, poches plaquées.",
      "Double-breasted blazer in printed cotton with horn buttons and patch pockets.",
    ],
    story: [
      "Un classique du vestiaire professionnel, revisité avec un imprimé vibrant pour porter le wax au bureau.",
      "A tailoring classic reworked with a vibrant print to bring wax into the office.",
    ],
    category: "couture",
    eur: 345,
    local: ["XOF", 226300],
    materials: [["Coton imprimé type wax", "Wax-style printed cotton"], ["Corne", "Horn"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "atelier-wax-abidjan",
    stock: 6,
  },
  {
    slug: "pantalon-palazzo-wax",
    name: ["Pantalon palazzo wax", "Wax palazzo trousers"],
    description: [
      "Pantalon large taille haute, imprimé graphique ocre et indigo, ceinture élastiquée.",
      "High-waisted wide-leg trousers in a graphic ochre and indigo print, with an elasticated waist.",
    ],
    story: [
      "Dessiné pour le mouvement : la largeur du pantalon met en valeur le dessin de l'imprimé quand on marche.",
      "Designed for movement: the width of the trousers lets the print come alive as you walk.",
    ],
    category: "couture",
    eur: 210,
    local: ["XOF", 137800],
    materials: [["Coton imprimé type wax", "Wax-style printed cotton"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "atelier-wax-abidjan",
    stock: 11,
  },
  {
    slug: "sac-cabas-wax-marche",
    name: ["Sac cabas wax « Marché »", "« Marché » wax tote bag"],
    description: [
      "Grand cabas doublé, anses en cuir végétal, poche intérieure zippée.",
      "Large lined tote with vegetable-tanned leather handles and an inner zip pocket.",
    ],
    story: [
      "Conçu à partir de coupes de tissu de la saison, pour un sac solide et unique à chaque série.",
      "Made from the season's fabric cuts, for a sturdy bag that differs slightly in each batch.",
    ],
    category: "couture",
    eur: 125,
    local: ["XOF", 82000],
    materials: [["Coton imprimé type wax", "Wax-style printed cotton"], ["Cuir tanné végétal", "Vegetable-tanned leather"]],
    dimensions: "40 × 35 × 15 cm",
    creatorSlug: "atelier-wax-abidjan",
    stock: 14,
  },

  // Cameroun — Fonderie de Foumban
  {
    slug: "sculpture-laiton-mere-enfant",
    name: ["Sculpture laiton « Mère et enfant »", "« Mother and Child » brass sculpture"],
    description: [
      "Sculpture en laiton coulé à la cire perdue, silhouettes stylisées, patine chaude.",
      "Lost-wax cast brass sculpture with stylised figures and a warm patina.",
    ],
    story: [
      "La fonte à la cire perdue exige de sculpter le modèle en cire, puis de le détruire pour le couler : chaque exemplaire est donc unique.",
      "Lost-wax casting means sculpting the model in wax and then destroying it to cast the metal: every piece is therefore unique.",
    ],
    category: "sculpture",
    eur: 680,
    local: ["XAF", 446100],
    materials: [BRASS],
    dimensions: "H 32 cm, 3,2 kg",
    creatorSlug: "fonderie-foumban",
    stock: 2,
  },
  {
    slug: "calebasse-perlee-decorative",
    name: ["Calebasse perlée décorative", "Decorative beaded calabash"],
    description: [
      "Calebasse séchée recouverte de perles de verre en frises géométriques, usage décoratif uniquement.",
      "Dried calabash covered with glass beads in geometric friezes, for decorative use only.",
    ],
    story: [
      "Une création contemporaine qui s'inspire du perlage d'Afrique centrale, sans reproduire aucun objet de cérémonie.",
      "A contemporary creation inspired by Central African beadwork, without copying any ceremonial object.",
    ],
    category: "decoration",
    eur: 230,
    local: ["XAF", 150900],
    materials: [["Calebasse", "Calabash"], ["Perles de verre", "Glass beads"]],
    dimensions: "H 28 cm, Ø 24 cm",
    creatorSlug: "fonderie-foumban",
    stock: 4,
  },
  {
    slug: "bracelet-laiton-cisele",
    name: ["Bracelet jonc en laiton ciselé", "Chiselled brass cuff bracelet"],
    description: [
      "Jonc ouvert en laiton, motifs ciselés à la main, ajustable.",
      "Open brass cuff with hand-chiselled motifs, adjustable.",
    ],
    story: [
      "Les chutes de fonderie sont refondues pour réaliser ces bijoux, limitant le gaspillage de métal.",
      "Foundry offcuts are re-melted to make these jewels, limiting metal waste.",
    ],
    category: "bijoux",
    eur: 58,
    local: ["XAF", 38000],
    materials: [["Laiton recyclé", "Recycled brass"]],
    creatorSlug: "fonderie-foumban",
    stock: 25,
  },
  {
    slug: "sculpture-oiseau-laiton",
    name: ["Sculpture « Oiseau en vol »", "« Bird in Flight » sculpture"],
    description: [
      "Sculpture abstraite en laiton poli sur socle en bois sombre.",
      "Abstract polished-brass sculpture on a dark wooden base.",
    ],
    story: [
      "Une pièce d'inspiration libre, où la technique de la cire perdue sert une forme minimaliste.",
      "A freely inspired piece where the lost-wax technique serves a minimalist form.",
    ],
    category: "sculpture",
    eur: 410,
    local: ["XAF", 268900],
    materials: [BRASS, ["Bois teinté foncé", "Dark stained wood"]],
    dimensions: "H 40 cm",
    creatorSlug: "fonderie-foumban",
    stock: 3,
  },

  // Burkina Faso — Tisserands du Faso
  {
    slug: "chemise-faso-dan-fani",
    name: ["Chemise Faso Dan Fani", "Faso Dan Fani shirt"],
    description: [
      "Chemise droite en coton tissé main à rayures, col mao, mixte.",
      "Straight handwoven striped cotton shirt with a mandarin collar, unisex.",
    ],
    story: [
      "Le Faso Dan Fani est un tissu de coton tissé en bandes ; sa promotion a soutenu de nombreux ateliers de tissage burkinabè.",
      "Faso Dan Fani is a cotton cloth woven in strips; its promotion has supported many Burkinabè weaving workshops.",
    ],
    category: "couture",
    eur: 118,
    local: ["XOF", 77400],
    materials: [["Coton filé main", "Hand-spun cotton"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "tisserands-du-faso",
    stock: 13,
  },
  {
    slug: "veste-faso-harmattan",
    name: ["Veste « Harmattan » en Faso Dan Fani", "« Harmattan » Faso Dan Fani jacket"],
    description: [
      "Veste légère matelassée, tissage rayé terre et indigo, fermeture à pressions.",
      "Lightweight quilted jacket in earth and indigo stripes, with snap closures.",
    ],
    story: [
      "Pensée pour les matins frais de la saison sèche, quand souffle l'harmattan.",
      "Designed for the cool mornings of the dry season, when the harmattan wind blows.",
    ],
    category: "couture",
    eur: 225,
    local: ["XOF", 147600],
    materials: [["Coton tissé main", "Handwoven cotton"]],
    sizes: CLOTHING_SIZES,
    creatorSlug: "tisserands-du-faso",
    stock: 6,
  },
  {
    slug: "echarpe-faso-rayee",
    name: ["Écharpe rayée en coton tissé main", "Handwoven striped cotton scarf"],
    description: [
      "Écharpe douce aux franges nouées, rayures ocre, crème et brun.",
      "Soft scarf with knotted fringes in ochre, cream and brown stripes.",
    ],
    story: [
      "Chaque écharpe est tissée sur un métier étroit, en quelques heures de travail continu.",
      "Each scarf is woven on a narrow loom over several hours of continuous work.",
    ],
    category: "textile",
    eur: 89,
    local: ["XOF", 58400],
    materials: [["Coton filé main", "Hand-spun cotton"]],
    dimensions: "30 × 180 cm",
    creatorSlug: "tisserands-du-faso",
    stock: 22,
  },
  {
    slug: "plaid-faso-savane",
    name: ["Plaid « Savane »", "« Savane » throw"],
    description: [
      "Plaid épais en coton tissé main, motif de bandes régulières, lavable en machine à froid.",
      "Thick handwoven cotton throw with regular stripes, machine washable cold.",
    ],
    story: [
      "Assemblé à partir de bandes de tissage, il rappelle la technique traditionnelle du faso dan fani.",
      "Assembled from woven strips, it recalls the traditional Faso Dan Fani technique.",
    ],
    category: "textile",
    eur: 175,
    local: ["XOF", 114800],
    materials: [["Coton tissé main", "Handwoven cotton"]],
    dimensions: "140 × 190 cm",
    creatorSlug: "tisserands-du-faso",
    stock: 8,
  },

  // Sénégal — Maison Teranga
  {
    slug: "boucles-filigrane-argent",
    name: ["Boucles d'oreilles filigrane", "Filigree earrings"],
    description: [
      "Boucles d'oreilles en argent filigrané, forme de goutte légère.",
      "Lightweight drop earrings in filigree sterling silver.",
    ],
    story: [
      "Le filigrane consiste à torsader de fins fils de métal puis à les assembler en motifs ajourés, geste précis et patient.",
      "Filigree means twisting fine metal threads and assembling them into openwork patterns, a precise and patient craft.",
    ],
    category: "bijoux",
    eur: 145,
    local: ["XOF", 95100],
    materials: [SILVER],
    creatorSlug: "maison-teranga",
    stock: 10,
  },
  {
    slug: "collier-filigrane-argent",
    name: ["Collier plastron en filigrane", "Filigree bib necklace"],
    description: [
      "Collier ras-de-cou en filigrane d'argent, fermoir à mousqueton, présenté en écrin.",
      "Silver filigree collar necklace with a lobster clasp, presented in a gift box.",
    ],
    story: [
      "Une pièce de cérémonie contemporaine, réalisée en plusieurs dizaines d'heures de travail à la main.",
      "A contemporary occasion piece, made over several dozen hours of handwork.",
    ],
    category: "bijoux",
    eur: 260,
    local: ["XOF", 170600],
    materials: [SILVER],
    creatorSlug: "maison-teranga",
    stock: 5,
  },
  {
    slug: "peinture-sous-verre-dakar",
    name: ["Peinture sous verre « Dakar au crépuscule »", "« Dakar at Dusk » reverse glass painting"],
    description: [
      "Peinture sous verre originale d'une scène de bord de mer au crépuscule, cadre en bois.",
      "Original reverse glass painting of a seaside scene at dusk, in a wooden frame.",
    ],
    story: [
      "La peinture sous verre se réalise à l'envers : les détails d'abord, le fond en dernier. Une tradition populaire largement pratiquée à Dakar.",
      "Reverse glass painting is done backwards: details first, background last. A popular tradition widely practised in Dakar.",
    ],
    category: "peinture",
    eur: 380,
    local: ["XOF", 249300],
    materials: [["Verre", "Glass"], ["Peinture à l'huile", "Oil paint"], ["Bois", "Wood"]],
    dimensions: "50 × 70 cm",
    creatorSlug: "maison-teranga",
    stock: 1,
  },

  // Kenya — Studio Nairobi Fibre
  {
    slug: "panier-mural-sisal",
    name: ["Panier mural en sisal", "Sisal wall basket"],
    description: [
      "Panier tressé en sisal teint naturellement, à suspendre comme élément de décoration.",
      "Naturally dyed woven sisal basket, to hang as a decorative element.",
    ],
    story: [
      "Le sisal est une fibre cultivée au Kenya, tressée depuis longtemps pour fabriquer paniers et sacs ; ce panier en détourne l'usage vers le mur.",
      "Sisal is a fibre grown in Kenya and long woven into baskets and bags; this piece moves it onto the wall.",
    ],
    category: "decoration",
    eur: 98,
    local: ["KES", 13700],
    materials: [SISAL],
    dimensions: "Ø 40 cm",
    creatorSlug: "studio-nairobi-fibre",
    stock: 16,
  },
  {
    slug: "sculpture-laiton-recycle-savane",
    name: ["Sculpture laiton recyclé « Savane »", "« Savanna » recycled brass sculpture"],
    description: [
      "Sculpture en laiton récupéré, lignes horizontales évoquant l'horizon de la savane.",
      "Reclaimed brass sculpture with horizontal lines evoking the savanna horizon.",
    ],
    story: [
      "Le laiton est fondu à partir d'objets usagés, une démarche de réemploi qui donne à la pièce sa teinte chaude et irrégulière.",
      "The brass is melted from used objects, a reuse approach that gives the piece its warm, uneven tone.",
    ],
    category: "sculpture",
    eur: 310,
    local: ["KES", 43400],
    materials: [["Laiton recyclé", "Recycled brass"]],
    dimensions: "H 25 cm",
    creatorSlug: "studio-nairobi-fibre",
    stock: 3,
  },
  {
    slug: "toile-acacia-aube",
    name: ["Toile « Acacia à l'aube »", "« Acacia at Dawn » canvas"],
    description: [
      "Peinture originale sur toile : silhouette d'acacia sur un ciel orangé, pièce unique.",
      "Original painting on canvas: an acacia silhouette against an orange sky, one of a kind.",
    ],
    story: [
      "Une peinture contemporaine inspirée de la lumière des paysages d'Afrique de l'Est, signée au dos.",
      "A contemporary painting inspired by the light of East African landscapes, signed on the back.",
    ],
    category: "peinture",
    eur: 460,
    local: ["KES", 64400],
    materials: [["Acrylique sur toile", "Acrylic on canvas"]],
    dimensions: "90 × 70 cm",
    creatorSlug: "studio-nairobi-fibre",
    stock: 1,
  },
];

export const products: Product[] = inputs.map(build);
