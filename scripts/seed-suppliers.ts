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
  }
}

main().finally(() => db.$disconnect());
