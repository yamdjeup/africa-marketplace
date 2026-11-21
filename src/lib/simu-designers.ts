// Import idempotent de créateurs d'illustration (simu uniquement). Aucun User ni Supplier : non connectables, sans produit.
export type SimuDesigner = {
  slug: string;
  name: string;
  country: string;
  countryEn: string;
  madeIn: string;
  madeInEn: string;
  gender: string;
  categories: string[];
  specialty: string;
  specialtyEn: string;
  bio: string;
  bioEn: string;
  image: string;
  website: string;
  email: string;
  instagram: string;
};

type Real = { slug: string; name: string; country?: string; privateWebsite?: string; privateEmail?: string; privateInstagram?: string };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

type Db = {
  creator: {
    findUnique(args: { where: { slug: string } }): Promise<{ simuIllustration: boolean } | null>;
    findMany(args: { where: { simuIllustration: false } }): Promise<Real[]>;
    delete(args: { where: { slug: string } }): Promise<unknown>;
    update(args: { where: { slug: string }; data: Record<string, unknown> }): Promise<unknown>;
    upsert(args: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
    deleteMany(args: { where: { simuIllustration: true } }): Promise<{ count: number }>;
  };
};

/** Catégories sources → catégories Epomta (slug, FR, EN), ordre stable, dédupliquées. */
const EPOMTA = {
  "couture-mode": ["Couture et mode", "Fashion and tailoring"],
  bijoux: ["Accessoires", "Accessories"],
  "textile-decoration": ["Textile et décoration", "Textiles and home decor"],
} as const;
const SOURCE_TO_EPOMTA: Record<string, (keyof typeof EPOMTA)[]> = {
  clothing: ["couture-mode"],
  shoes: ["couture-mode"],
  bags: ["bijoux"],
  accessories: ["bijoux"],
  jewelry: ["bijoux"],
  textiles: ["textile-decoration"],
};
export function mapSimuCategories(keys: string[]) {
  const slugs = (Object.keys(EPOMTA) as (keyof typeof EPOMTA)[]).filter((s) => keys.some((k) => SOURCE_TO_EPOMTA[k]?.includes(s)));
  return { slugs, fr: slugs.map((s) => EPOMTA[s][0]).join(", "), en: slugs.map((s) => EPOMTA[s][1]).join(", ") };
}

export async function importSimuDesigners(db: Db, list: SimuDesigner[]) {
  let skipped = 0;
  const real = new Map(
    (await db.creator.findMany({ where: { simuIllustration: false } })).map((r) => [norm(r.name ?? ""), r] as const),
  );
  const slugReal = (r: Real) => real.set(`slug:${r.slug}`, r);
  for (const r of [...real.values()]) slugReal(r);
  for (const d of list) {
    const existing = await db.creator.findUnique({ where: { slug: d.slug } });
    const match = (existing && !existing.simuIllustration ? real.get(`slug:${d.slug}`) : undefined) ?? real.get(norm(d.name));
    if (match) {
      // Fusion : on garde le profil reel (slug, produits, bio, photo) et on ajoute nom, Fabrique en, pays et coordonnees privees vides.
      const empty = (v?: string) => !v;
      await db.creator.update({
        where: { slug: match.slug },
        data: {
          name: d.name,
          madeIn: d.madeIn,
          madeInEn: d.madeInEn,
          ...(empty(match.country) ? { country: d.country, countryEn: d.countryEn } : {}),
          ...(empty(match.privateWebsite) ? { privateWebsite: d.website } : {}),
          ...(empty(match.privateEmail) ? { privateEmail: d.email } : {}),
          ...(empty(match.privateInstagram) ? { privateInstagram: d.instagram } : {}),
        },
      });
      for (const dup of new Set([d.slug, `simu-${d.slug}`])) {
        if (dup !== match.slug && (await db.creator.findUnique({ where: { slug: dup } }))?.simuIllustration) await db.creator.delete({ where: { slug: dup } });
      }
      console.warn(`fusionne dans le profil existant : ${d.slug} -> ${match.slug}`);
      skipped++;
      continue;
    }    const legacy = `simu-${d.slug}`;
    const cat = mapSimuCategories(d.categories);
    const data = {
      name: d.name,
      specialty: cat.fr || d.specialty,
      specialtyEn: cat.en || d.specialtyEn,
      bio: cat.fr ? d.bio.replace(/Univers : .*$/, `Univers : ${cat.fr.toLowerCase()}.`) : d.bio,
      bioEn: cat.en ? d.bioEn.replace(/Universe: .*$/, `Universe: ${cat.en.toLowerCase()}.`) : d.bioEn,
      image: d.image,
      sourceUrl: "",
      simuIllustration: true,
      country: d.country,
      countryEn: d.countryEn,
      madeIn: d.madeIn,
      madeInEn: d.madeInEn,
      gender: d.gender,
      privateWebsite: d.website,
      privateEmail: d.email,
      privateInstagram: d.instagram,
    };
    if (!existing && (await db.creator.findUnique({ where: { slug: legacy } }))?.simuIllustration) {
      await db.creator.update({ where: { slug: legacy }, data: { slug: d.slug, ...data } });
      continue;
    }
    await db.creator.upsert({ where: { slug: d.slug }, update: data, create: { slug: d.slug, ...data } });
  }
  return list.length - skipped;
}

export async function removeSimuDesigners(db: Db) {
  return (await db.creator.deleteMany({ where: { simuIllustration: true } })).count;
}
