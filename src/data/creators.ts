import type { Creator } from "./types";

/** Source des biographies : G3A Visual Arts 2026, article du 20 octobre 2026. */
export const G3A_SOURCE_URL = "https://g3a.org/g3a-visual-arts-2026-decouvrez-les-six-artistes-selectionnes/";

const img = (file: string) => `/images/artworks/${file}.jpg`;

export const creators: Creator[] = [
  {
    slug: "aurelie-victoire-celanie",
    name: "Aurélie-Victoire Célanie",
    specialty: "Peinture, dessin et installation",
    specialtyEn: "Painting, drawing and installation",
    bio: "Originaire de Guadeloupe, Aurélie-Victoire Célanie développe une pratique mêlant peinture, dessin et installation. Son travail explore notamment les questions de filiation, de mémoire et de construction identitaire, dans un dialogue constant entre héritages et expérience contemporaine.",
    bioEn:
      "Originally from Guadeloupe, Aurélie-Victoire Célanie develops a practice combining painting, drawing and installation. Her work explores questions of filiation, memory and identity construction, in a constant dialogue between heritage and contemporary experience.",
    image: img("celanie-2"),
    sourceUrl: G3A_SOURCE_URL,
  },
  {
    slug: "cruzz-taylor",
    name: "Cruzz Taylor",
    specialty: "Photographie",
    specialtyEn: "Photography",
    bio: "Photographe et danseur autodidacte, Cruzz Taylor place l'humain, la dignité et la mémoire au centre de son travail. À travers ses images, il cherche notamment à dépasser les représentations réductrices de certains territoires pour restituer la complexité des personnes qui les habitent.",
    bioEn:
      "A self-taught photographer and dancer, Cruzz Taylor places the human being, dignity and memory at the centre of his work. Through his images, he seeks in particular to move beyond reductive representations of certain territories and to restore the complexity of the people who live there.",
    image: img("taylor-1"),
    sourceUrl: G3A_SOURCE_URL,
  },
  {
    slug: "nathalie-morere",
    name: "Nathalie Morère",
    specialty: "Sculpture et céramique",
    specialtyEn: "Sculpture and ceramics",
    bio: "Artiste plasticienne travaillant notamment la sculpture et la céramique, Nathalie Morere développe un univers où se rencontrent mémoire, identité, vestiges et transmission. Ses formes semblent parfois provenir d'une civilisation réelle ou imaginaire et interrogent ce que nous conservons, reconstruisons ou projetons sur nos héritages.",
    bioEn:
      "A visual artist working in particular with sculpture and ceramics, Nathalie Morere develops a universe where memory, identity, vestiges and transmission meet. Her forms sometimes seem to come from a real or imaginary civilisation and question what we preserve, rebuild or project onto our heritage.",
    image: img("morere-2"),
    sourceUrl: G3A_SOURCE_URL,
  },
  {
    slug: "kenof",
    name: "KeNoF",
    specialty: "Peinture, sculpture, installation et performance",
    specialtyEn: "Painting, sculpture, installation and performance",
    bio: "Artiste multidisciplinaire d'origine camerounaise, KeNoF travaille entre peinture, sculpture, installation et performance. Son univers met en relation mémoire, spiritualité, déplacement et héritage bamiléké, en transformant les références traditionnelles en matériaux de création contemporaine.",
    bioEn:
      "A multidisciplinary artist of Cameroonian origin, KeNoF works across painting, sculpture, installation and performance. His universe connects memory, spirituality, displacement and Bamileke heritage, turning traditional references into materials for contemporary creation.",
    image: img("kenof-1"),
    sourceUrl: G3A_SOURCE_URL,
  },
  {
    slug: "paula-padua-nogueira",
    name: "Paula Padua Nogueira",
    specialty: "Peinture",
    specialtyEn: "Painting",
    bio: "À travers la peinture, Paula Padua Nogueira explore une identité traversée par plusieurs héritages, notamment congolais, portugais et belge. Son travail aborde le métissage, le colorisme, les standards de beauté, la mémoire coloniale et la manière dont le regard social participe à la construction de l'identité.",
    bioEn:
      "Through painting, Paula Padua Nogueira explores an identity shaped by several heritages, notably Congolese, Portuguese and Belgian. Her work addresses mixed heritage, colourism, beauty standards, colonial memory and the way the social gaze contributes to the construction of identity.",
    image: img("padua-2"),
    sourceUrl: G3A_SOURCE_URL,
  },
];
