import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

// Non-régression des requêtes des pages Stocks (admin + partenaire) et des filtres de période : exécutées réellement (base jetable TEST_DATABASE_URL, jamais la production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("pages Stocks et filtres de période (base de test)", () => {
  let db: PrismaClient;
  let supplierId: string;
  let slug: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    const tag = Date.now().toString(36).toUpperCase();
    slug = `stk-${tag.toLowerCase()}`;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/x.png", sourceUrl: "x" } });
    await db.product.create({ data: { slug, name: `Bague ${tag}`, nameEn: `Ring ${tag}`, description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-hold", creatorSlug: "test-hold", supplierId, priceCents: 5000, materials: [], sizes: [], images: [], stock: 3, reserved: 1, status: "PUBLISHED" } });
    const v = await db.productVariant.create({ data: { productSlug: slug, label: "T52", stock: 3, reserved: 1 } });
    await db.stockMovement.create({ data: { productSlug: slug, variantId: v.id, type: "RESERVE", quantity: -1, reason: "Réservation en attente de paiement (AM-X)", authorLabel: "t@example.com" } });
  });

  afterAll(async () => {
    await db.stockMovement.deleteMany({ where: { productSlug: slug } });
    await db.productVariant.deleteMany({ where: { productSlug: slug } });
    await db.product.deleteMany({ where: { slug } });
    await db.supplier.delete({ where: { id: supplierId } });
    await db.$disconnect();
  });

  const variants = (): Record<string, string>[] => [
    {},
    { d: "all" },
    { d: "today" },
    { d: "7" },
    { d: "30" },
    { d: "custom", from: "2020-01-01", to: "2099-01-01" },
    { from: "2020-01-01" },
    { q: "bague", t: "RESERVE", who: "example", r: "attente", dir: "asc" },
    { sup: supplierId },
    { p: "2", sp: "2" },
  ];

  it("admin /stock : toutes les combinaisons de filtres s'exécutent", async () => {
    const { loadAdminStock } = await import("@/lib/admin-stock");
    for (const sp of variants()) {
      const r = await loadAdminStock(sp, true);
      expect(r.pages).toBeGreaterThanOrEqual(1);
    }
    const r = await loadAdminStock({ sup: supplierId }, true);
    expect(r.stockRows.map((x) => x.slug)).toContain(slug);
    expect(r.rows.some((m) => m.productSlug === slug)).toBe(true);
    expect(r.varRows.some((x) => x.label === "T52")).toBe(true);
  });

  it("partenaire /stocks : liste de stock et journal (période incluse)", async () => {
    const { queryPartnerWorks } = await import("@/lib/partner-works");
    const { journalOrder, journalWhere } = await import("@/lib/stock-journal");
    for (const f of ["all", "low", "out"]) {
      const r = await queryPartnerWorks(supplierId, { f }, { page: 1 });
      expect(r.total).toBeGreaterThanOrEqual(0);
    }
    for (const sp of variants()) {
      const where = await journalWhere(sp, [slug]);
      await db.stockMovement.findMany({ where, orderBy: journalOrder(sp), take: 10 });
      await db.stockMovement.count({ where });
    }
    const all = await db.stockMovement.count({ where: await journalWhere({ d: "all" }, [slug]) });
    expect(all).toBe(1);
  });

  it("listes admin : parseList + période produisent des filtres valides", async () => {
    const { parseList } = await import("@/lib/admin-list");
    for (const sp of variants()) {
      const q = parseList(sp, ["all"], "all", ["recent"], "recent");
      expect(["all", "today", "7", "30", "custom"]).toContain(q.d);
    }
  });
});
