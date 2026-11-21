// Import idempotent de créateurs d'illustration (simu uniquement). Aucun User ni Supplier : non connectables, sans produit.
export type SimuDesigner = {
  slug: string;
  name: string;
  country: string;
  madeIn: string;
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
    upsert(args: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
    deleteMany(args: { where: { simuIllustration: true } }): Promise<{ count: number }>;
  };
};

export async function importSimuDesigners(db: Db, list: SimuDesigner[]) {
  for (const d of list) {
    if (!d.slug.startsWith("simu-")) throw new Error(`slug sans préfixe simu- : ${d.slug}`);
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
      madeIn: d.madeIn,
      gender: d.gender,
      privateWebsite: d.website,
      privateEmail: d.email,
      privateInstagram: d.instagram,
    };
    await db.creator.upsert({ where: { slug: d.slug }, update: data, create: { slug: d.slug, ...data } });
  }
  return list.length;
}

export async function removeSimuDesigners(db: Db) {
  return (await db.creator.deleteMany({ where: { simuIllustration: true } })).count;
}
