import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("annulation de soumission (base de test)", () => {
  let db: PrismaClient;
  let supA: string;
  let supB: string;
  const tag = Date.now().toString(36);
  const slug = (n: string) => `wd-${tag}-${n}`;
  const mk = (n: string, status: string, supplierId: string) =>
    db.product.create({ data: { slug: slug(n), name: n, nameEn: n, description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-hold", creatorSlug: "test-hold", supplierId, priceCents: 5000, materials: [], sizes: [], images: [], stock: 1, status, submittedAt: new Date() } });

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    supA = (await db.supplier.create({ data: { displayName: `A ${tag}`, country: "CM", craftType: "couture" } })).id;
    supB = (await db.supplier.create({ data: { displayName: `B ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/x.png", sourceUrl: "x" } });
    for (const n of ["sub", "pub", "rej", "other"]) await mk(n, n === "pub" ? "PUBLISHED" : n === "rej" ? "REJECTED" : "SUBMITTED", n === "other" ? supB : supA);
  });
  afterAll(async () => {
    if (!db) return;
    await db.product.deleteMany({ where: { slug: { startsWith: `wd-${tag}` } } });
    await db.supplier.deleteMany({ where: { id: { in: [supA, supB] } } });
  });

  it("repasse une création Soumise en brouillon", async () => {
    const { withdrawSubmission } = await import("@/lib/product-withdraw");
    expect(await withdrawSubmission(db, slug("sub"), supA)).toBe("ok");
    const p = await db.product.findUnique({ where: { slug: slug("sub") } });
    expect(p?.status).toBe("DRAFT");
    expect(p?.submittedAt).toBeNull();
  });
  it("refuse si l'admin a déjà décidé (publiée/refusée) sans rien modifier", async () => {
    const { withdrawSubmission } = await import("@/lib/product-withdraw");
    expect(await withdrawSubmission(db, slug("pub"), supA)).toBe("changed");
    expect(await withdrawSubmission(db, slug("rej"), supA)).toBe("changed");
    expect((await db.product.findUnique({ where: { slug: slug("pub") } }))?.status).toBe("PUBLISHED");
    expect((await db.product.findUnique({ where: { slug: slug("rej") } }))?.status).toBe("REJECTED");
  });
  it("refuse une création d'un autre partenaire", async () => {
    const { withdrawSubmission } = await import("@/lib/product-withdraw");
    expect(await withdrawSubmission(db, slug("other"), supA)).toBe("notfound");
    expect((await db.product.findUnique({ where: { slug: slug("other") } }))?.status).toBe("SUBMITTED");
  });
});
