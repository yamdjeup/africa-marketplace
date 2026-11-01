import { PrismaClient } from "@prisma/client";
import { categories, creators, products } from "../src/data";

const prisma = new PrismaClient();

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  for (const c of creators) {
    await prisma.creator.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  // createdAt décalé par produit pour que le tri « nouveautés » soit stable.
  const base = Date.UTC(2026, 9, 1);
  for (const [i, p] of products.entries()) {
    const data = {
      name: p.name,
      nameEn: p.nameEn,
      description: p.description,
      descriptionEn: p.descriptionEn,
      story: p.story,
      storyEn: p.storyEn,
      categorySlug: p.category,
      creatorSlug: p.creatorSlug,
      priceCents: p.priceCents,
      materials: p.materials,
      sizes: p.sizes,
      dimensions: p.dimensions ?? null,
      stock: p.stock,
      images: p.images,
      createdAt: new Date(base - i * 86_400_000),
    };
    await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }

  // Retire les anciennes données (couture) absentes du jeu actuel ; les commandes qui y renvoient sont supprimées.
  const keep = products.map((p) => p.slug);
  await prisma.orderItem.deleteMany({ where: { productSlug: { notIn: keep } } });
  await prisma.product.deleteMany({ where: { slug: { notIn: keep } } });
  await prisma.creator.deleteMany({ where: { slug: { notIn: creators.map((c) => c.slug) } } });
  await prisma.category.deleteMany({ where: { slug: { notIn: categories.map((c) => c.slug) } } });

  console.log(`Seed OK : ${categories.length} catégories, ${creators.length} artistes, ${products.length} œuvres`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
