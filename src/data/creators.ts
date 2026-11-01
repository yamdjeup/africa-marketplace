import type { Creator } from "./types";

const img = (slug: string) => `/images/creators/${slug}.svg`;

export const creators: Creator[] = [
  {
    slug: "atelier-sahel-indigo",
    name: "Atelier Sahel Indigo",
    country: "Mali",
    countryEn: "Mali",
    city: "Ségou",
    specialty: "Bogolan et teintures végétales",
    specialtyEn: "Bogolan and plant-based dyeing",
    bio: "Atelier fictif inspiré de la tradition du bogolan malien, textile de coton teint à la boue fermentée et aux décoctions végétales. Il imagine des pièces contemporaines qui prolongent un savoir-faire transmis de génération en génération.",
    bioEn:
      "A fictional studio inspired by the Malian bogolan tradition: handwoven cotton dyed with fermented mud and plant decoctions. It designs contemporary pieces that carry a craft passed down through generations.",
    image: img("atelier-sahel-indigo"),
  },
  {
    slug: "maison-kumasi-weave",
    name: "Maison Kumasi Weave",
    country: "Ghana",
    countryEn: "Ghana",
    city: "Kumasi",
    specialty: "Tissage de kente",
    specialtyEn: "Kente weaving",
    bio: "Maison fictive dédiée au kente, tissé en bandes étroites sur métier à main puis assemblées. Chaque motif porte un nom et une signification ; la maison les présente avec respect et sans les détourner.",
    bioEn:
      "A fictional house devoted to kente, woven in narrow strips on a handloom and then joined together. Each pattern carries a name and a meaning; the house presents them with respect and never repurposes them carelessly.",
    image: img("maison-kumasi-weave"),
  },
  {
    slug: "studio-adire-abeokuta",
    name: "Studio Adire Abeokuta",
    country: "Nigeria",
    countryEn: "Nigeria",
    city: "Abeokuta",
    specialty: "Adire, teinture à réserve à l'indigo",
    specialtyEn: "Adire, indigo resist dyeing",
    bio: "Studio fictif inspiré de l'adire yoruba, où l'on réserve des motifs par ligatures, plis ou pochoirs avant la teinture à l'indigo. Il mêle textiles, couture et art mural.",
    bioEn:
      "A fictional studio inspired by Yoruba adire, where patterns are resisted with tying, folding or stencils before indigo dyeing. It blends textiles, tailoring and wall art.",
    image: img("studio-adire-abeokuta"),
  },
  {
    slug: "atelier-wax-abidjan",
    name: "Atelier Wax Abidjan",
    country: "Côte d'Ivoire",
    countryEn: "Ivory Coast",
    city: "Abidjan",
    specialty: "Couture contemporaine en wax",
    specialtyEn: "Contemporary wax tailoring",
    bio: "Atelier de couture fictif installé à Abidjan. Il coupe et assemble des pièces structurées dans des cotons imprimés de type wax, pensées comme de la haute couture du quotidien.",
    bioEn:
      "A fictional tailoring studio based in Abidjan. It cuts and assembles structured pieces in wax-style printed cottons, designed as everyday haute couture.",
    image: img("atelier-wax-abidjan"),
  },
  {
    slug: "fonderie-foumban",
    name: "Fonderie de Foumban",
    country: "Cameroun",
    countryEn: "Cameroon",
    city: "Foumban",
    specialty: "Laiton à la cire perdue et perlage",
    specialtyEn: "Lost-wax brass casting and beadwork",
    bio: "Fonderie d'art fictive inspirée des ateliers de Foumban, au cœur du Grassland camerounais, réputés pour la fonte à la cire perdue et le perlage. Elle crée des sculptures et des objets de décoration.",
    bioEn:
      "A fictional art foundry inspired by the workshops of Foumban, in Cameroon's Grassfields, renowned for lost-wax casting and beadwork. It creates sculptures and decorative objects.",
    image: img("fonderie-foumban"),
  },
  {
    slug: "tisserands-du-faso",
    name: "Tisserands du Faso",
    country: "Burkina Faso",
    countryEn: "Burkina Faso",
    city: "Ouagadougou",
    specialty: "Faso Dan Fani et coton tissé main",
    specialtyEn: "Faso Dan Fani and handwoven cotton",
    bio: "Collectif fictif de tisserands inspiré du Faso Dan Fani, le « pagne tissé de la patrie ». Il transforme le coton filé et tissé à la main en vêtements et accessoires sobres et durables.",
    bioEn:
      "A fictional weavers' collective inspired by Faso Dan Fani, the « woven cloth of the homeland ». It turns hand-spun, handwoven cotton into understated, durable garments and accessories.",
    image: img("tisserands-du-faso"),
  },
  {
    slug: "maison-teranga",
    name: "Maison Teranga",
    country: "Sénégal",
    countryEn: "Senegal",
    city: "Dakar",
    specialty: "Bijouterie en filigrane et peinture sous verre",
    specialtyEn: "Filigree jewellery and reverse glass painting",
    bio: "Maison fictive dakaroise, dont le nom évoque la teranga, l'hospitalité sénégalaise. Elle crée des bijoux en filigrane et des peintures sous verre aux scènes poétiques.",
    bioEn:
      "A fictional Dakar house whose name evokes teranga, Senegalese hospitality. It makes filigree jewellery and reverse glass paintings with poetic scenes.",
    image: img("maison-teranga"),
  },
  {
    slug: "studio-nairobi-fibre",
    name: "Studio Nairobi Fibre",
    country: "Kenya",
    countryEn: "Kenya",
    city: "Nairobi",
    specialty: "Vannerie, fibres et art mural",
    specialtyEn: "Basketry, fibres and wall art",
    bio: "Studio fictif de Nairobi qui associe vannerie en sisal, laiton recyclé et peinture contemporaine. Il revisite les gestes de la vannerie kényane pour la maison et l'art mural.",
    bioEn:
      "A fictional Nairobi studio combining sisal basketry, recycled brass and contemporary painting. It reinterprets Kenyan basketry techniques for the home and wall art.",
    image: img("studio-nairobi-fibre"),
  },
];
