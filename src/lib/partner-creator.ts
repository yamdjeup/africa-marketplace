import "server-only";
import { randomBytes } from "node:crypto";
import { slugify } from "@/lib/category-rules";
import { db } from "@/lib/db";

type SupplierLike = { id: string; displayName: string; bio: string; bioEn: string; craftType: string; creatorSlug: string | null };

// Page boutique du partenaire. Slug = nom nettoyé ; suffixe technique seulement si le slug est déjà pris (par une page ou un ancien alias).
export async function ensureCreator(supplier: SupplierLike) {
  if (supplier.creatorSlug) return supplier.creatorSlug;
  const base = slugify(supplier.displayName) || "partenaire";
  let slug = base;
  while ((await db.creator.findUnique({ where: { slug } })) || (await db.creatorSlugAlias.findUnique({ where: { oldSlug: slug } }))) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }
  await db.creator.create({
    data: { slug, name: supplier.displayName, specialty: supplier.craftType, specialtyEn: supplier.craftType, bio: supplier.bio, bioEn: supplier.bioEn || supplier.bio, image: "", sourceUrl: "" },
  });
  await db.supplier.update({ where: { id: supplier.id }, data: { creatorSlug: slug } });
  return slug;
}
