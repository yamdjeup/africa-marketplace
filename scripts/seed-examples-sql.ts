// Génère prisma/seed.examples.neon.sql (ajout) et prisma/seed.examples.remove.neon.sql (suppression) pour le jeu d'exemple.
// Ces fichiers sont indépendants de prisma/seed.neon.sql. Usage : npm run db:seed-examples-sql
import { writeFileSync } from "node:fs";
import { exampleCreators, exampleProducts, legacyExampleCreatorSlugs, legacyExampleSlugs } from "../src/data/examples";

const str = (v: string) => `'${v.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${str(JSON.stringify(v))}::jsonb`;
const sn = (v?: string) => (v ? str(v) : "NULL");
const slugs = [...exampleProducts, ...legacyExampleSlugs.map((slug) => ({ slug }))].map((p) => str(p.slug)).join(", ");

const creatorSlugs = [...exampleCreators.map((c) => c.slug), ...legacyExampleCreatorSlugs].map(str).join(", ");
const creatorCols = ["slug", "name", "specialty", "specialtyEn", "bio", "bioEn", "image", "sourceUrl"];
const productCols = ["slug", "name", "nameEn", "description", "descriptionEn", "story", "storyEn", "categorySlug", "creatorSlug", "priceCents", "materials", "sizes", "material", "materialEn", "careInstructions", "careInstructionsEn", "hasCertificate", "stock", "images"];
const upsert = (table: string, cols: string[], values: string[]) =>
  `INSERT INTO "${table}" (${cols.map((x) => `"${x}"`).join(", ")}) VALUES (${values.join(", ")})\nON CONFLICT ("slug") DO UPDATE SET ${cols
    .filter((x) => x !== "slug")
    .map((x) => `"${x}" = EXCLUDED."${x}"`)
    .join(", ")};`;

const add = [
  "-- E póm ta’ — jeu d'exemple (Miroir) : 3 créateurs de démo + 4 pièces « Exemple ». Généré par `npm run db:seed-examples-sql`.",
  "-- Idempotent, indépendant de seed.neon.sql. Retrait : seed.examples.remove.neon.sql.",
  "BEGIN;",
  `DELETE FROM "Product" WHERE "slug" IN (${legacyExampleSlugs.map(str).join(", ")});`,
  `DELETE FROM "Creator" WHERE "slug" IN (${legacyExampleCreatorSlugs.map(str).join(", ")});`,
  ...exampleCreators.map((c) => upsert("Creator", creatorCols, [c.slug, c.name, c.specialty, c.specialtyEn, c.bio, c.bioEn, c.image, c.sourceUrl].map(str))),
  ...exampleProducts.map((p) =>
    upsert("Product", productCols, [
      str(p.slug), str(p.name), str(p.nameEn), str(p.description), str(p.descriptionEn), str(p.story), str(p.storyEn),
      str(p.category), str(p.creatorSlug), String(p.priceCents), json(p.materials), json(p.sizes),
      sn(p.material?.fr), sn(p.material?.en), sn(p.careInstructions?.fr), sn(p.careInstructions?.en),
      String(p.hasCertificate), String(p.stock), json(p.images),
    ]),
  ),
  "COMMIT;",
];

const remove = [
  "-- E póm ta’ — retire le jeu d'exemple (Miroir). Généré par `npm run db:seed-examples-sql`.",
  "BEGIN;",
  `DELETE FROM "OrderItem" WHERE "productSlug" IN (${slugs});`,
  `DELETE FROM "Product" WHERE "slug" IN (${slugs});`,
  `DELETE FROM "Creator" WHERE "slug" IN (${creatorSlugs});`,
  "COMMIT;",
];

writeFileSync("prisma/seed.examples.neon.sql", add.join("\n") + "\n", "utf8");
writeFileSync("prisma/seed.examples.remove.neon.sql", remove.join("\n") + "\n", "utf8");
console.log("prisma/seed.examples.neon.sql et prisma/seed.examples.remove.neon.sql générés");
