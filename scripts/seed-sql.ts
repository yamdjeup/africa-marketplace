// Génère prisma/seed.neon.sql (PostgreSQL, idempotent) à partir des mêmes données que prisma/seed.ts.
// Usage : npm run db:seed-sql
import { writeFileSync } from "node:fs";
import { categories, creators, products } from "../src/data";

const str = (v: string) => `'${v.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${str(JSON.stringify(v))}::jsonb`;
const upsert = (table: string, cols: string[], rows: string[][], key: string) => {
  const update = cols.filter((c) => c !== key).map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
  const names = cols.map((c) => `"${c}"`).join(", ");
  return rows
    .map((r) => `INSERT INTO "${table}" (${names}) VALUES (${r.join(", ")})\nON CONFLICT ("${key}") DO UPDATE SET ${update};`)
    .join("\n");
};
const list = (xs: string[]) => (xs.length ? xs.map(str).join(", ") : "''");

const out: string[] = [
  "-- E póm ta’ — chargement des données (généré par `npm run db:seed-sql`, ne pas modifier à la main).",
  "-- Idempotent : peut être exécuté plusieurs fois. À coller dans Neon > SQL Editor.",
  "BEGIN;",
  upsert("Category", ["slug", "name", "nameEn", "sortOrder"], categories.map((c) => [str(c.slug), str(c.name), str(c.nameEn), String(c.sortOrder)]), "slug"),
  upsert(
    "Creator",
    ["slug", "name", "specialty", "specialtyEn", "bio", "bioEn", "image", "sourceUrl"],
    creators.map((c) => [c.slug, c.name, c.specialty, c.specialtyEn, c.bio, c.bioEn, c.image, c.sourceUrl].map(str)),
    "slug",
  ),
];

const base = Date.UTC(2026, 9, 1);
const cols = ["slug", "name", "nameEn", "description", "descriptionEn", "story", "storyEn", "categorySlug", "creatorSlug", "priceCents", "materials", "sizes", "dimensions", "material", "materialEn", "technique", "techniqueEn", "country", "countryEn", "region", "regionEn", "widthCm", "heightCm", "depthCm", "careInstructions", "careInstructionsEn", "hasCertificate", "stock", "images", "createdAt"];
const sn = (v?: string) => (v ? str(v) : "NULL");
const nn = (v?: number) => (v === undefined ? "NULL" : String(v));
out.push(
  upsert(
    "Product",
    cols,
    products.map((p, i) => [
      str(p.slug), str(p.name), str(p.nameEn), str(p.description), str(p.descriptionEn), str(p.story), str(p.storyEn),
      str(p.category), str(p.creatorSlug), String(p.priceCents), json(p.materials), json(p.sizes),
      p.dimensions ? str(p.dimensions) : "NULL",
      sn(p.material?.fr), sn(p.material?.en), sn(p.technique?.fr), sn(p.technique?.en),
      sn(p.country?.fr), sn(p.country?.en), sn(p.region?.fr), sn(p.region?.en),
      nn(p.widthCm), nn(p.heightCm), nn(p.depthCm),
      sn(p.careInstructions?.fr), sn(p.careInstructions?.en), String(p.hasCertificate),
      String(p.stock), json(p.images),
      `'${new Date(base - i * 86_400_000).toISOString()}'::timestamp`,
    ]),
    "slug",
  ),
  `DELETE FROM "OrderItem" WHERE "productSlug" NOT IN (${list(products.map((p) => p.slug))});`,
  `DELETE FROM "Product" WHERE "slug" NOT IN (${list(products.map((p) => p.slug))});`,
  `DELETE FROM "Creator" WHERE "slug" NOT IN (${list(creators.map((c) => c.slug))});`,
  `DELETE FROM "Category" WHERE "slug" NOT IN (${list(categories.map((c) => c.slug))});`,
  "COMMIT;",
);

writeFileSync("prisma/seed.neon.sql", out.join("\n") + "\n", "utf8");
console.log(`prisma/seed.neon.sql : ${categories.length} catégories, ${creators.length} artistes, ${products.length} œuvres`);
