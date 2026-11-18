import { describe, expect, it, vi } from "vitest";
import { decideReturn, markReturnReceived, parseStockChoice, refundReturn, requestReturn, returnEligibility } from "@/lib/returns";

const now = new Date("2026-11-20T12:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("returnEligibility", () => {
  it("accepte un colis livré il y a 10 jours", () => expect(returnEligibility({ status: "DELIVERED", deliveredAt: days(10) }, false, now)).toBe("ok"));
  it("refuse au-delà de 14 jours", () => expect(returnEligibility({ status: "DELIVERED", deliveredAt: days(15) }, false, now)).toBe("expired"));
  it("refuse un colis non livré", () => expect(returnEligibility({ status: "SHIPPED", deliveredAt: null }, false, now)).toBe("not_delivered"));
  it("refuse une seconde demande", () => expect(returnEligibility({ status: "DELIVERED", deliveredAt: days(1) }, true, now)).toBe("exists"));
});

describe("requestReturn", () => {
  const sub = { status: "DELIVERED", deliveredAt: days(2), order: { userId: "u1" } };
  const mk = (s: unknown, count = 0) => ({ subOrder: { findUnique: vi.fn().mockResolvedValue(s) }, returnRequest: { count: vi.fn().mockResolvedValue(count), create: vi.fn().mockResolvedValue({ id: "r1" }) } }) as never;
  it("crée la demande du propriétaire", async () => expect(await requestReturn(mk(sub), "u1", "s1", "Taille incorrecte", now)).toEqual({ ok: true, id: "r1" }));
  it("refuse un autre utilisateur", async () => expect(await requestReturn(mk(sub), "u2", "s1", "Taille incorrecte", now)).toEqual({ ok: false, error: "forbidden" }));
  it("exige un motif", async () => expect(await requestReturn(mk(sub), "u1", "s1", " ", now)).toEqual({ ok: false, error: "reason" }));
  it("refuse un doublon", async () => expect(await requestReturn(mk(sub, 1), "u1", "s1", "Taille incorrecte", now)).toEqual({ ok: false, error: "exists" }));
});

describe("decideReturn", () => {
  it("ne décide que depuis « demandé »", async () => {
    const db = { returnRequest: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn() } } as never;
    expect(await decideReturn(db, "r1", "ACCEPTED", "", now)).toBeNull();
  });
});

describe("refundReturn", () => {
  const ret = { id: "r1", status: "ACCEPTED", subOrderId: "s1", subOrder: { subtotalCents: 5000, order: { stripePaymentIntentId: "pi_1" } } };
  const mk = () => ({
    returnRequest: { findUnique: vi.fn().mockResolvedValue(ret), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    subOrder: { update: vi.fn() },
    ledgerEntry: { updateMany: vi.fn() },
  });
  it("rembourse et annule l'écriture comptable", async () => {
    const db = mk();
    const r = await refundReturn(db as never, "r1", async () => ({ status: "DONE", refundId: "re_1" }), now);
    expect(r).toEqual({ done: true, refundId: "re_1" });
    expect(db.ledgerEntry.updateMany).toHaveBeenCalled();
  });
  it("garde « accepté » avec une note en cas d'échec", async () => {
    const db = mk();
    const r = await refundReturn(db as never, "r1", async () => ({ status: "FAILED", note: "carte" }), now);
    expect(r).toEqual({ done: false, note: "carte" });
    expect(db.ledgerEntry.updateMany).not.toHaveBeenCalled();
  });
});

describe("retour : colis reçu, remise en vente, frais de port", () => {
  const sub = { number: "AM-1-A", subtotalCents: 5000, order: { stripePaymentIntentId: "pi_1", number: "AM-1" } };
  const mk = (status: string) => ({
    returnRequest: { findUnique: vi.fn().mockResolvedValue({ id: "r1", status, subOrderId: "s1", subOrder: sub }), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    subOrder: { update: vi.fn() },
    ledgerEntry: { updateMany: vi.fn() },
    orderItem: { findMany: vi.fn().mockResolvedValue([{ productSlug: "p1", size: null, quantity: 2 }]) },
    productVariant: { findMany: vi.fn().mockResolvedValue([]) },
    stockMovement: { create: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(1),
  });
  it("markReturnReceived : uniquement depuis « accepté »", async () => {
    const db = mk("ACCEPTED");
    expect(await markReturnReceived(db as never, "r1")).toBe(true);
    expect(db.returnRequest.updateMany.mock.calls[0][0].where).toEqual({ id: "r1", status: "ACCEPTED" });
    db.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    expect(await markReturnReceived(db as never, "r1")).toBe(false);
  });
  it("rembourse depuis « reçu » au sous-total seul (sans port)", async () => {
    const db = mk("RECEIVED");
    const refund = vi.fn().mockResolvedValue({ status: "DONE", refundId: "re_1" });
    expect((await refundReturn(db as never, "r1", refund, now))?.done).toBe(true);
    expect(refund.mock.calls[0][0].amountCents).toBe(5000);
  });
  it("remet en stock (+quantité) seulement si la case est cochée", async () => {
    const off = mk("RECEIVED");
    await refundReturn(off as never, "r1", async () => ({ status: "DONE", refundId: "re_1" }), now, false);
    expect(off.stockMovement.create).not.toHaveBeenCalled();
    const on = mk("RECEIVED");
    await refundReturn(on as never, "r1", async () => ({ status: "DONE", refundId: "re_1" }), now, true);
    expect(on.stockMovement.create.mock.calls[0][0].data).toMatchObject({ productSlug: "p1", type: "RETURN", quantity: 2 });
  });
  it("exclusion du stock : mouvement de 0 unité avec motif, stock inchangé", async () => {
    const db = mk("RECEIVED");
    await refundReturn(db as never, "r1", async () => ({ status: "DONE", refundId: "re_1" }), now, { exclude: "article endommagé" });
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.stockMovement.create.mock.calls[0][0].data).toMatchObject({ productSlug: "p1", quantity: 0, authorLabel: "administration", reason: "Retour remboursé, exclu du stock : AM-1-A — article endommagé" });
  });
  it("exclusion sans motif : refusée avant tout remboursement", async () => {
    const db = mk("RECEIVED");
    const refund = vi.fn();
    expect(await refundReturn(db as never, "r1", refund, now, { exclude: "  " })).toBeNull();
    expect(refund).not.toHaveBeenCalled();
  });
  it("parseStockChoice : liste obligatoire, motif obligatoire si exclu", () => {
    const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
    expect(parseStockChoice(fd({}))).toBeNull();
    expect(parseStockChoice(fd({ stock: "restock" }))).toBe(true);
    expect(parseStockChoice(fd({ stock: "exclude" }))).toBeNull();
    expect(parseStockChoice(fd({ stock: "exclude", excludeReason: " cassé " }))).toEqual({ exclude: "cassé" });
  });
  it("pas de remise en stock si le remboursement échoue", async () => {
    const db = mk("RECEIVED");
    await refundReturn(db as never, "r1", async () => ({ status: "FAILED", note: "x" }), now, true);
    expect(db.stockMovement.create).not.toHaveBeenCalled();
  });
});