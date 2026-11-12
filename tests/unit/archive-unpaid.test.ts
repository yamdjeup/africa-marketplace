import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { archiveUnpaidOrders } from "@/lib/archive-unpaid";

const order = (number: string, status: string, refundStatus = "") => ({
  id: number, number, createdAt: new Date("2026-11-01"), email: "a@test.example", totalCents: 5000, items: [],
  subOrders: [{ id: `${number}-s`, number: `${number}-1`, status, refundStatus }],
});

function fakeDb(orders: ReturnType<typeof order>[]) {
  const update = vi.fn();
  const tx = { subOrder: { updateMany: async () => ({ count: 0 }) }, order: { update } };
  const db = {
    order: { findMany: async () => orders },
    ledgerEntry: { findMany: async () => [] },
    $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
  } as unknown as PrismaClient;
  return { db, update };
}

describe("archivage des commandes impayées", () => {
  it("simulation : ne modifie rien ; ignore expédiées et remboursées", async () => {
    const { db, update } = fakeDb([order("AM-C83CA71A", "PENDING"), order("AM-X", "SHIPPED"), order("AM-Y", "CANCELLED", "DONE")]);
    const r = await archiveUnpaidOrders(db, false);
    expect(r.orders.map((o) => o.number)).toEqual(["AM-C83CA71A"]);
    expect(r.ignored.map((i) => i.number)).toEqual(["AM-X", "AM-Y"]);
    expect(update).not.toHaveBeenCalled();
  });
  it("exécution : archive uniquement les commandes sûres", async () => {
    const { db, update } = fakeDb([order("AM-C08665C5", "PENDING"), order("AM-X", "DELIVERED")]);
    await archiveUnpaidOrders(db, true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where.id).toBe("AM-C08665C5");
  });
});
