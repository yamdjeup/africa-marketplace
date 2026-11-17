import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("filtre « En stock uniquement » (base de test)", () => {
  it("ne renvoie que des articles avec stock ou variante disponible", async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    const { searchProducts } = await import("@/lib/catalog");
    const { paramsOf } = await import("@/lib/api-v1");
    expect(paramsOf(new URLSearchParams("inStock=1")).inStock).toBe(true);
    expect(paramsOf(new URLSearchParams("")).inStock).toBeUndefined();
    const all = await searchProducts({}, "fr");
    const some = await searchProducts({ inStock: true }, "fr");
    expect(some.total).toBeLessThanOrEqual(all.total);
    const { listProducts } = await import("@/lib/api-v1");
    const l = await listProducts(new URLSearchParams(""), "https://x.test");
    for (const p of l.items) expect(p.soldOut).toBe(p.stock <= 0 || (p.sizeStock != null && Object.values(p.sizeStock).every((n) => n <= 0)));
    for (const p of some.items) {
      expect(p.variants.length > 0 ? p.variants.some((v) => v.available > 0) : p.stock > 0).toBe(true);
    }
  });
});
