import { describe, expect, it, vi } from "vitest";
import { decideReturn, refundReturn, requestReturn, returnEligibility } from "@/lib/returns";

const now = new Date("2026-11-20T12:00:00Z");
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("returnEligibility", () => {
  it("accepte un colis livré il y a 10 jours", () => expect(returnEligibility({ status: "DELIVERED", deliveredAt: days(10) }, false, now)).toBe("ok"));
  it("refuse au-delà de 30 jours", () => expect(returnEligibility({ status: "DELIVERED", deliveredAt: days(31) }, false, now)).toBe("expired"));
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
