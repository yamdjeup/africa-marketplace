// Vérification du suivi de stock (SQLite dev ou DATABASE_URL). Usage : npm run db:check-stock
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { adjustStock, confirmSale, releaseStock, reserveStock, returnStock } from "../src/lib/stock";

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = `file:${join(process.cwd(), "prisma", ".dev", "dev.db").replace(/\\/g, "/")}`;
const db = new PrismaClient();
const actor = { id: null, label: "check-stock" };
let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name} ${extra}`);
  if (!cond) failed++;
};
const state = async (slug: string) => {
  const p = await db.product.findUniqueOrThrow({ where: { slug } });
  return { stock: p.stock, reserved: p.reserved, status: p.status };
};

async function main() {
  const cat = await db.category.findFirstOrThrow();
  const creator = await db.creator.findFirstOrThrow();
  const slug = `check-stock-${Date.now()}`;
  await db.product.create({
    data: { slug, name: "Test stock", nameEn: "Stock test", description: "x", descriptionEn: "x", story: "", storyEn: "", categorySlug: cat.slug, creatorSlug: creator.slug, priceCents: 1000, materials: [], images: [], sizes: [], stock: 1, country: "-", countryEn: "-", hasCertificate: false, status: "PUBLISHED" },
  });
  try {
    // Concurrence : 8 acheteurs, 1 pièce.
    const res = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => db.$transaction((tx) => reserveStock(tx, { slug, label: null }, 1, { id: null, label: `buyer${i}` }, `T${i}`))));
    const wins = res.filter((r) => r.status === "fulfilled" && r.value === true).length;
    ok("dernière pièce : exactement 1 réservation", wins === 1, `(succès=${wins})`);
    ok("réservé = 1", (await state(slug)).reserved === 1);

    ok("ajustement sous le réservé refusé", !(await db.$transaction((tx) => adjustStock(tx, { slug, label: null }, -1, "ADJUST", "test", actor))));
    await db.$transaction((tx) => releaseStock(tx, { slug, label: null }, 1, "test", actor, "T0"));
    ok("libération", (await state(slug)).reserved === 0);

    await db.$transaction((tx) => reserveStock(tx, { slug, label: null }, 1, actor, "T1"));
    await db.$transaction((tx) => confirmSale(tx, { slug, label: null }, 1, actor, "T1"));
    const sold = await state(slug);
    ok("vente confirmée : stock 0, réservé 0", sold.stock === 0 && sold.reserved === 0);
    await db.$transaction((tx) => returnStock(tx, { slug, label: null }, 1, "retour", actor, "T1"));
    ok("retour : stock 1", (await state(slug)).stock === 1);
    ok("entrée de stock", await db.$transaction((tx) => adjustStock(tx, { slug, label: null }, 4, "ENTRY", "entrée", actor)));
    ok("stock = 5", (await state(slug)).stock === 5);

    // Variantes
    await db.productVariant.createMany({ data: [{ productSlug: slug, label: "M", stock: 2 }, { productSlug: slug, label: "L", stock: 3 }] });
    const rv = await db.$transaction((tx) => reserveStock(tx, { slug, label: "M" }, 3, actor, "T2"));
    ok("variante M : 3 > 2 refusé", rv === false);
    const rv2 = await db.$transaction((tx) => reserveStock(tx, { slug, label: "M" }, 2, actor, "T3"));
    const vm = await db.productVariant.findFirstOrThrow({ where: { productSlug: slug, label: "M" } });
    ok("variante M : 2 réservés", rv2 === true && vm.reserved === 2);
    ok("journal des mouvements non vide", (await db.stockMovement.count({ where: { productSlug: slug } })) >= 6);
  } finally {
    await db.stockMovement.deleteMany({ where: { productSlug: slug } });
    await db.product.delete({ where: { slug } });
  }
  console.log(failed ? `\n${failed} échec(s)` : "\nTout est OK");
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
