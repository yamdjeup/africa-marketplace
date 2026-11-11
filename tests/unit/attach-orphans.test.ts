import { describe, expect, it } from "vitest";
import { attachOrphans } from "@/lib/attach-orphans";

function fake(orphans: string[], suppliers: string[]) {
  const owner = new Map<string, string | null>(orphans.map((s) => [s, null]));
  return {
    owner,
    db: {
      supplier: { findMany: async () => suppliers.map((id) => ({ id })) },
      product: {
        count: async () => [...owner.values()].filter((v) => v === null).length,
        findMany: async () => [...owner].filter(([, v]) => v === null).map(([slug]) => ({ slug })),
        update: async (a: { where: { slug: string }; data: { supplierId: string } }) => { owner.set(a.where.slug, a.data.supplierId); },
      },
    },
  };
}

describe("attachOrphans", () => {
  it("répartit en tourniquet et finit à 0", async () => {
    const f = fake(["a", "b", "c"], ["s1", "s2"]);
    expect(await attachOrphans(f.db)).toEqual({ before: 3, after: 0, suppliers: 2 });
    expect([...f.owner.values()]).toEqual(["s1", "s2", "s1"]);
  });
  it("sans partenaire actif : rien ne change", async () => {
    const f = fake(["a"], []);
    expect((await attachOrphans(f.db)).after).toBe(1);
  });
});
