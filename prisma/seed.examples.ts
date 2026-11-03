// Jeu d'exemple (essayage au Miroir), SÉPARÉ du seed principal.
// Usage : node scripts/db.mjs examples-add | examples-remove
import { PrismaClient } from "@prisma/client";
import { exampleCreator, exampleProducts, legacyExampleSlugs } from "../src/data/examples";

const prisma = new PrismaClient();
const mode = process.argv[2];

async function main() {
  const slugs = exampleProducts.map((p) => p.slug);
  await prisma.product.deleteMany({ where: { slug: { in: legacyExampleSlugs } } });
  if (mode === "remove") {
    await prisma.orderItem.deleteMany({ where: { productSlug: { in: slugs } } });
    await prisma.product.deleteMany({ where: { slug: { in: slugs } } });
    await prisma.creator.deleteMany({ where: { slug: exampleCreator.slug } });
    console.log(`Exemples retirés : ${slugs.length} pièces, 1 créateur`);
    return;
  }
  if (mode !== "add") throw new Error("Usage : add | remove");

  await prisma.creator.upsert({ where: { slug: exampleCreator.slug }, update: exampleCreator, create: exampleCreator });
  for (const p of exampleProducts) {
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
      material: p.material?.fr ?? null,
      materialEn: p.material?.en ?? null,
      careInstructions: p.careInstructions?.fr ?? null,
      careInstructionsEn: p.careInstructions?.en ?? null,
      hasCertificate: p.hasCertificate,
      stock: p.stock,
      images: p.images,
    };
    await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }
  console.log(`Exemples ajoutés : ${exampleProducts.length} pièces, 1 créateur`);
}

main().finally(() => prisma.$disconnect());
