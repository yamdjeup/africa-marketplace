/* eslint-disable @typescript-eslint/no-explicit-any */
// TEMPORAIRE : rattache les œuvres sans partenaire aux partenaires ACTIVE (tourniquet). À supprimer après usage.
type Db = {
  supplier: { findMany: (a: any) => Promise<{ id: string }[]> };
  product: { count: (a: any) => Promise<number>; findMany: (a: any) => Promise<{ slug: string }[]>; update: (a: any) => Promise<unknown> };
};

export async function attachOrphans(db: Db) {
  const before = await db.product.count({ where: { supplierId: null } });
  const suppliers = await db.supplier.findMany({ where: { status: "ACTIVE" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } });
  if (suppliers.length > 0 && before > 0) {
    const orphans = await db.product.findMany({ where: { supplierId: null }, orderBy: [{ createdAt: "asc" }, { slug: "asc" }], select: { slug: true } });
    for (const [i, o] of orphans.entries()) {
      await db.product.update({ where: { slug: o.slug }, data: { supplierId: suppliers[i % suppliers.length].id } });
    }
  }
  const after = await db.product.count({ where: { supplierId: null } });
  return { before, after, suppliers: suppliers.length };
}
