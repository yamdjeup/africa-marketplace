import { describe, expect, it } from "vitest";
import { purgeTestResidue, type ResidueClient } from "../../prisma/test-residue";

describe("purge des résidus de test", () => {
  it("supprime les dépendances avant les produits test-hold, sans toucher aux autres produits", async () => {
    const calls: string[] = [];
    const del = (name: string) => ({ deleteMany: async (a: unknown) => void calls.push(`${name}:${JSON.stringify(a)}`) });
    const db = {
      product: { ...del("product"), findMany: async (a: { where: { categorySlug: string } }) => { calls.push(`find:${a.where.categorySlug}`); return [{ slug: "hold-x" }]; } },
      orderItem: del("orderItem"), stockMovement: del("stockMovement"), favorite: del("favorite"),
      restockWatch: del("restockWatch"), checkoutHold: del("checkoutHold"), subOrder: del("subOrder"), order: del("order"),
    } as unknown as ResidueClient;
    expect(await purgeTestResidue(db)).toBe(1);
    expect(calls[0]).toBe("find:test-hold");
    expect(calls[calls.length - 1]).toBe('product:{"where":{"slug":{"in":["hold-x"]}}}');
    const order = calls.map((c) => c.split(":")[0]);
    expect(order.indexOf("orderItem")).toBeLessThan(order.indexOf("order"));
    expect(order.indexOf("subOrder")).toBeLessThan(order.indexOf("order"));
    expect(calls.find((c) => c.startsWith("order:"))).toContain('"startsWith":"AM-H"');
  });
});
