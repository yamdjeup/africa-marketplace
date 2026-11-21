import { canonCountry } from "@/lib/countries";

export type CreatorInput = {
  slug?: string;
  name: string;
  countries: string[]; // clés canoniques ou noms
  madeIn: string;
  madeInEn: string;
  categories: string[]; // slugs Epomta
  specialty: string;
  specialtyEn: string;
  bio: string;
  bioEn: string;
  image: string;
  website: string;
  email: string;
  instagram: string;
  published: boolean;
};

const CATS = new Set(["peinture", "sculpture", "couture-mode", "bijoux", "textile-decoration", "photographie"]);

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Db = {
  creator: {
    findUnique(a: { where: { slug: string } }): Promise<{ slug: string; simuIllustration: boolean } | null>;
    upsert(a: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
  };
};

/** Création / édition d'un profil créateur par un admin ; un non-admin est refusé. */
export async function saveCreatorProfile(db: Db, isAdmin: boolean, input: CreatorInput) {
  if (!isAdmin) return "forbidden" as const;
  const name = input.name.trim();
  const slug = slugify(input.slug?.trim() || name);
  if (name.length < 2 || !slug) return "invalid" as const;
  const countries = input.countries.map((c) => canonCountry(c.trim())).filter((c) => c.en);
  const uniq = [...new Map(countries.map((c) => [c.key, c])).values()];
  const data = {
    name,
    specialty: input.specialty.trim(),
    specialtyEn: input.specialtyEn.trim() || input.specialty.trim(),
    bio: input.bio.trim(),
    bioEn: input.bioEn.trim() || input.bio.trim(),
    image: input.image.trim(),
    country: uniq.map((c) => c.fr).join(", "),
    countryEn: uniq.map((c) => c.en).join(", "),
    madeIn: input.madeIn.trim(),
    madeInEn: input.madeInEn.trim() || input.madeIn.trim(),
    categorySlugs: [...new Set(input.categories.filter((c) => CATS.has(c)))].join(","),
    privateWebsite: input.website.trim(),
    privateEmail: input.email.trim(),
    privateInstagram: input.instagram.trim(),
    published: input.published,
  };
  const existing = await db.creator.findUnique({ where: { slug } });
  await db.creator.upsert({
    where: { slug },
    update: data,
    create: { slug, sourceUrl: "", profileOnly: true, ...data },
  });
  return existing ? ("updated" as const) : ("created" as const);
}
