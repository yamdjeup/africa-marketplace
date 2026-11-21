// Import idempotent de créateurs d'illustration (simu uniquement). Aucun User ni Supplier : non connectables, sans produit.
export type SimuDesigner = {
  slug: string;
  name: string;
  country: string;
  countryEn: string;
  madeIn: string;
  madeInEn: string;
  gender: string;
  specialty: string;
  specialtyEn: string;
  bio: string;
  bioEn: string;
  image: string;
  website: string;
  email: string;
  instagram: string;
};

type Db = {
  creator: {
    findUnique(args: { where: { slug: string } }): Promise<{ simuIllustration: boolean } | null>;
    update(args: { where: { slug: string }; data: Record<string, unknown> }): Promise<unknown>;
    upsert(args: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
    deleteMany(args: { where: { simuIllustration: true } }): Promise<{ count: number }>;
  };
};

export async function importSimuDesigners(db: Db, list: SimuDesigner[]) {
  let skipped = 0;
  for (const d of list) {
    const existing = await db.creator.findUnique({ where: { slug: d.slug } });
    if (existing && !existing.simuIllustration) {
      console.warn(`ignoré (slug déjà pris par un créateur réel) : ${d.slug}`);
      skipped++;
      continue;
    }
    const legacy = `simu-${d.slug}`;
    const data = {
      name: d.name,
      specialty: d.specialty,
      specialtyEn: d.specialtyEn,
      bio: d.bio,
      bioEn: d.bioEn,
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
