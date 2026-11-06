// Fournisseurs de démonstration (vraies lignes en base), idempotent. Usage : npm run db:seed-suppliers
// Local : SQLite par défaut. Neon : définir DATABASE_URL (Postgres) avant de lancer la commande.
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = `file:${join(process.cwd(), "prisma", ".dev", "dev.db").replace(/\\/g, "/")}`;
const db = new PrismaClient();

const DEMOS = [
  { id: "demo-kenof", slug: "kenof", country: "Cameroun", craftType: "Peinture", commissionRate: 0.15 },
  { id: "demo-nathalie", slug: "nathalie-morere", country: "Cameroun", craftType: "Couture et mode", commissionRate: 0.15 },
  { id: "demo-taylor", slug: "cruzz-taylor", country: "Ghana", craftType: "Couture et mode", commissionRate: 0.2 },
];

async function main() {
  for (const d of DEMOS) {
    const creator = await db.creator.findUnique({ where: { slug: d.slug } });
    if (!creator) {
      console.warn(`créateur introuvable : ${d.slug} (ignoré)`);
      continue;
    }
    const data = { displayName: creator.name, country: d.country, craftType: d.craftType, bio: creator.bio, bioEn: creator.bio, creatorSlug: creator.slug, status: "ACTIVE", commissionRate: d.commissionRate, isDemo: true };
    await db.supplier.upsert({ where: { id: d.id }, update: data, create: { id: d.id, ...data } });
    console.log(`fournisseur de démo : ${creator.name}`);

    // Rattache les œuvres existantes du créateur, avec stock initial journalisé (idempotent).
    const products = await db.product.findMany({ where: { creatorSlug: d.slug } });
    for (const p of products) {
      if (p.supplierId && p.supplierId !== d.id) continue;
      await db.product.update({ where: { slug: p.slug }, data: { supplierId: d.id } });
      if ((await db.stockMovement.count({ where: { productSlug: p.slug } })) === 0 && p.stock > 0)
        await db.stockMovement.create({ data: { productSlug: p.slug, type: "ENTRY", quantity: p.stock, reason: "Stock initial", authorLabel: "Seed démo" } });
    }
    // Couture : variantes de taille sur la première œuvre (stock réparti), une seule fois.
    const first = products[0];
    if (first && d.craftType.startsWith("Couture") && (await db.productVariant.count({ where: { productSlug: first.slug } })) === 0) {
      const base = Math.max(first.stock, 3);
      const split = [["S", 1], ["M", Math.max(1, base - 2)], ["L", 1]] as const;
      for (const [label, stock] of split) {
        const v = await db.productVariant.create({ data: { productSlug: first.slug, label, stock } });
        await db.stockMovement.create({ data: { productSlug: first.slug, variantId: v.id, type: "ENTRY", quantity: stock, reason: "Stock initial (variantes)", authorLabel: "Seed démo" } });
      }
      const total = split.reduce((n, [, q]) => n + q, 0);
      await db.product.update({ where: { slug: first.slug }, data: { stock: total, sizes: split.map(([l]) => l) } });
    }
    // Une œuvre soumise (à modérer) pour KeNoF, copie d'une œuvre existante, une seule fois.
    const sample = products[1];
    const demoSlug = `${d.slug}-demo-a-moderer`;
    if (d.id === "demo-kenof" && sample && !(await db.product.findUnique({ where: { slug: demoSlug } }))) {
      const { createdAt: _c, ...rest } = sample as typeof sample & { createdAt?: Date };
      void _c;
      await db.product.create({ data: { ...rest, materials: rest.materials as string[], images: rest.images as string[], sizes: rest.sizes as string[], slug: demoSlug, name: `${sample.name} (nouvelle série)`, nameEn: `${sample.nameEn} (new series)`, supplierId: d.id, status: "SUBMITTED", submittedAt: new Date(), stock: 1, reserved: 0, edition: "Pièce unique" } });
      await db.stockMovement.create({ data: { productSlug: demoSlug, type: "ENTRY", quantity: 1, reason: "Stock initial", authorLabel: "Seed démo" } });
    }
  }
}

main().finally(() => db.$disconnect());
