import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

vi.mock("next/cache", () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));

// Recherche et filtres mobile (/api/v1/products, catalog/count, search/*) sur base jetable TEST_DATABASE_URL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile recherche et filtres (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let supplierId: string;
  const base = "https://example.test";
  const cat = () => `cat-s-${tag}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36);
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.create({ data: { slug: cat(), name: "Cat", nameEn: "Cat" } });
    await db.creator.upsert({ where: { slug: "test-search" }, update: {}, create: { slug: "test-search", name: "Createur", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/images/x.png", sourceUrl: "x" } });
    const data = { description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: cat(), creatorSlug: "test-search", materials: [], sizes: [], images: ["/api/media/abc"], stock: 3, supplierId, status: "PUBLISHED" as const };
    await db.product.create({ data: { ...data, slug: `s-a-${tag}`, name: "Alpha", nameEn: "Alpha", priceCents: 1000 } });
    await db.product.create({ data: { ...data, slug: `s-b-${tag}`, name: "Beta", nameEn: "Beta", priceCents: 9000 } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.product.deleteMany({ where: { slug: { in: [`s-a-${tag}`, `s-b-${tag}`] } } });
    await db.category.delete({ where: { slug: cat() } }).catch(() => undefined);
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
  });

  it("liste : filtre prix (EUR), tri et options de filtres", async () => {
    const { GET } = await import("@/app/api/v1/products/route");
    const r = await (await GET(new Request(`${base}/api/v1/products?category=${cat()}&max=50&sort=price-desc`))).json();
    expect(r.items.map((p: { slug: string }) => p.slug)).toEqual([`s-a-${tag}`]);
    expect(r.options.categories.length).toBeGreaterThan(0);
    expect(r.sizes).toBeDefined();
  });

  it("catalog/count : total aligné sur la liste", async () => {
    const { GET } = await import("@/app/api/v1/catalog/count/route");
    const r = await (await GET(new Request(`${base}/api/v1/catalog/count?category=${cat()}`))).json();
    expect(r.total).toBe(2);
    expect(r.sizes).toHaveProperty("options");
  });

  it("search/suggest et search/extras répondent", async () => {
    const s = await import("@/app/api/v1/search/suggest/route");
    const sj = await (await s.GET(new Request(`${base}/api/v1/search/suggest?q=Alpha`))).json();
    expect(sj).toHaveProperty("products");
    const e = await import("@/app/api/v1/search/extras/route");
    const ej = await (await e.GET(new Request(`${base}/api/v1/search/extras?q=zzzzqq`))).json();
    expect(Array.isArray(ej.suggested)).toBe(true);
  });
});
