import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { parseList } from "@/lib/admin-list";
import { notifyRestockWatches } from "@/lib/restock-watch";

describe("sélecteur de période des listes", () => {
  const parse = (sp: Record<string, string>) => parseList(sp, ["all"], "all", ["recent"], "recent");
  it("toutes les dates par défaut, sans bornes", () => {
    const q = parse({});
    expect(q.d).toBe("all");
    expect(q.from).toBeNull();
    expect(q.to).toBeNull();
  });
  it("aujourd'hui, 7 j et 30 j bornent la période", () => {
    expect(parse({ d: "today" }).from).not.toBeNull();
    const w = parse({ d: "7" });
    const m = parse({ d: "30" });
    expect(m.from!.getTime()).toBeLessThan(w.from!.getTime());
  });
  it("plage personnalisée (explicite ou déduite de from/to)", () => {
    const q = parse({ d: "custom", from: "2026-01-01", to: "2026-01-31" });
    expect(q.d).toBe("custom");
    expect(q.from).not.toBeNull();
    expect(q.to).not.toBeNull();
    expect(parse({ from: "2026-01-01" }).d).toBe("custom");
  });
  it("valeur inconnue ignorée", () => {
    expect(parse({ d: "zzz" }).d).toBe("all");
  });
});

type Watch = { id: string; buyerKey: string; email: string; locale: string; productSlug: string; notifiedAt: Date | null; createdAt: Date };
function fakeDb(watches: Watch[], product: { stock: number; reserved: number }, opts: { fav?: boolean; bought?: number } = {}) {
  return {
    restockWatch: {
      findMany: async () => watches.filter((w) => !w.notifiedAt),
      update: async ({ where, data }: { where: { id: string }; data: { notifiedAt: Date | null } }) => { watches.find((w) => w.id === where.id)!.notifiedAt = data.notifiedAt; },
      updateMany: async ({ where, data }: { where: { id: string }; data: { notifiedAt: Date } }) => {
        const w = watches.find((x) => x.id === where.id && !x.notifiedAt);
        if (w) w.notifiedAt = data.notifiedAt;
        return { count: w ? 1 : 0 };
      },
    },
    product: { findMany: async () => [{ slug: "bague", name: "Bague", nameEn: "Ring", status: "PUBLISHED", priceCents: 5000, images: [], ...product }] },
    user: { findFirst: async () => null },
    favorite: { findUnique: async () => (opts.fav ? { id: "f" } : null) },
    orderItem: { count: async () => opts.bought ?? 0 },
  } as unknown as PrismaClient;
}
const w = (): Watch => ({ id: "w1", buyerKey: "u:1", email: "a@example.com", locale: "fr", productSlug: "bague", notifiedAt: null, createdAt: new Date() });

describe("alertes « de nouveau disponible » (notifyRestockWatches)", () => {
  it("envoie une fois puis marque envoyée (idempotent)", async () => {
    const ws = [w()];
    const send = vi.fn(async () => true);
    expect(await notifyRestockWatches(fakeDb(ws, { stock: 1, reserved: 0 }), send)).toBe(1);
    expect(await notifyRestockWatches(fakeDb(ws, { stock: 1, reserved: 0 }), send)).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("échec d'envoi (Resend) : l'alerte n'est pas marquée envoyée, même si l'envoi lève", async () => {
    const ws = [w()];
    expect(await notifyRestockWatches(fakeDb(ws, { stock: 1, reserved: 0 }), async () => false)).toBe(0);
    expect(ws[0].notifiedAt).toBeNull();
    expect(await notifyRestockWatches(fakeDb(ws, { stock: 1, reserved: 0 }), async () => { throw new Error("resend"); })).toBe(0);
    expect(ws[0].notifiedAt).toBeNull();
  });
  it("stock encore à 0 ou entièrement réservé : rien envoyé, alerte conservée", async () => {
    const ws = [w()];
    const send = vi.fn(async () => true);
    expect(await notifyRestockWatches(fakeDb(ws, { stock: 1, reserved: 1 }), send)).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(ws[0].notifiedAt).toBeNull();
  });
  it("favori ou déjà achetée : pas d'e-mail, alerte close", async () => {
    for (const o of [{ fav: true }, { bought: 1 }]) {
      const ws = [w()];
      const send = vi.fn(async () => true);
      expect(await notifyRestockWatches(fakeDb(ws, { stock: 2, reserved: 0 }, o), send)).toBe(0);
      expect(send).not.toHaveBeenCalled();
      expect(ws[0].notifiedAt).not.toBeNull();
    }
  });
});
