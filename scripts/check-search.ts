// Vérifie la recherche tolérante sur la base locale : npx tsx scripts/check-search.ts
import { PrismaClient } from "@prisma/client";
import { tokenize } from "../src/lib/search-core";
import { didYouMean, matchCreators, suggest, type SearchIndex } from "../src/lib/search-index";
import { CREATOR_COUNTRIES } from "../src/data/creator-country";

async function main() {
  const db = new PrismaClient();
  const [creators, categories, products] = await Promise.all([db.creator.findMany(), db.category.findMany(), db.product.findMany({ include: { creator: true } })]);
  const ix: SearchIndex = {
    creators: creators.map((c) => ({
      slug: c.slug, name: c.name, image: c.image, specialty: c.specialty, specialtyEn: c.specialtyEn,
      core: tokenize([c.name, c.specialty, c.specialtyEn, ...(CREATOR_COUNTRIES[c.slug] ?? []).map((k) => `${k.fr} ${k.en}`)].join(" ")),
      bio: tokenize(`${c.bio} ${c.bioEn}`),
    })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, nameEn: c.nameEn })),
    products: products.map((p) => ({
      slug: p.slug, name: p.name, nameEn: p.nameEn, creator: p.creator.name, categorySlug: p.categorySlug,
      core: tokenize([p.name, p.nameEn, p.material, p.materialEn, p.technique, p.techniqueEn].filter(Boolean).join(" ")),
    })),
  };
  const cases: [string, string][] = [
    ["kenoff", "kenof"], ["kenof", "kenof"], ["keno", "kenof"], ["kénof", "kenof"], ["KENOF", "kenof"],
    ["cruz", "cruzz-taylor"], ["krus taylor", "cruzz-taylor"], ["morere", "nathalie-morere"],
  ];
  let fail = 0;
  for (const [q, slug] of cases) {
    const got = matchCreators(ix, q).map((c) => c.slug);
    const ok = got.some((s) => s.includes(slug.split("-")[0]));
    if (!ok) fail++;
    console.log(ok ? "OK  " : "FAIL", q, "→", got.join(",") || "∅");
  }
  for (const q of ["pientur", "sculptur", "peinture", "robe", "dress", "photo", "bijou", "tableau", "Cameroun", "ghana", "imane", "ldm"]) {
    const s = suggest(ix, q, "fr");
    console.log("INFO", q, "→ artistes:", s.artists.map((a) => a.slug).join(",") || "∅", "| cat:", s.categories.map((c) => c.slug).join(",") || "∅", "| œuvres:", s.products.length, "| dym:", didYouMean(ix, q, "fr")?.label ?? "∅");
  }
  console.log("slugs:", creators.map((c) => c.slug).join(","), "| cats:", categories.map((c) => c.slug).join(","));
  await db.$disconnect();
  if (fail) process.exit(1);
}
main();
