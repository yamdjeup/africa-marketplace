import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

vi.mock("next/cache", () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));

// Routes publiques en lecture seule /api/v1 pour l'app mobile (base jetable TEST_DATABASE_URL, jamais la production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile /api/v1 (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let supplierId: string;
  const slug = () => `mob-${tag}`;
  const hidden = () => `mob-draft-${tag}`;
  const base = "https://example.test";

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36);
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "Créatrice", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/images/x.png", sourceUrl: "x" } });
    const data = { name: "Pièce", nameEn: "Piece", description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-mob", creatorSlug: "test-mob", priceCents: 4200, materials: [], sizes: [], images: ["/api/media/abc"], stock: 3, supplierId };
    await db.product.create({ data: { ...data, slug: slug(), status: "PUBLISHED" } });
    await db.product.create({ data: { ...data, slug: hidden(), status: "DRAFT" } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.product.deleteMany({ where: { slug: { in: [slug(), hidden()] } } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
  });

  it("liste : filtre catégorie, images absolues, brouillons exclus", async () => {
    const { GET } = await import("@/app/api/v1/products/route");
    const res = await GET(new Request(`${base}/api/v1/products?category=test-mob`));
    const json = await res.json();
    const slugs = json.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain(slug());
    expect(slugs).not.toContain(hidden());
    const item = json.items.find((p: { slug: string }) => p.slug === slug());
    expect(item.images[0]).toBe(`${base}/api/media/abc`);
    expect(item.priceCents).toBe(4200);
    expect(item.url).toBe(`${base}/fr/produits/${slug()}`);
  });

  it("fiche : 200 si publiée, 404 si brouillon ou inconnue", async () => {
    const { GET } = await import("@/app/api/v1/products/[slug]/route");
    const call = (s: string) => GET(new Request(`${base}/api/v1/products/${s}`), { params: Promise.resolve({ slug: s }) });
    expect((await call(slug())).status).toBe(200);
    expect((await call(hidden())).status).toBe(404);
    expect((await call("inconnu-xyz")).status).toBe(404);
  });

  it("accueil : catégories, créateurs et regroupement par catégorie", async () => {
    const { GET } = await import("@/app/api/v1/home/route");
    const json = await (await GET(new Request(`${base}/api/v1/home?locale=en`))).json();
    expect(json.categories.length).toBeGreaterThan(0);
    expect(Array.isArray(json.creators)).toBe(true);
    expect(json.latest.map((p: { slug: string }) => p.slug)).not.toContain(hidden());
  });
});
