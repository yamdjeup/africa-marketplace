import { describe, expect, it, vi } from "vitest";
import { activeCarrierNames, addCarrier, deleteCarrier, deleteReturnReason } from "@/lib/config-lists";
import { requestReturn } from "@/lib/returns";

const now = new Date("2026-11-20T12:00:00Z");
const sub = { status: "DELIVERED", deliveredAt: new Date("2026-11-18T12:00:00Z"), order: { userId: "u1" } };

const mkReturn = (reason: { id: string; fr: string; requiresPhotos: boolean } | null, photosOwned = 1) => {
  const create = vi.fn().mockResolvedValue({ id: "r1" });
  const db = {
    subOrder: { findUnique: vi.fn().mockResolvedValue(sub) },
    returnReason: { findFirst: vi.fn().mockResolvedValue(reason) },
    mediaFile: { count: vi.fn().mockResolvedValue(photosOwned) },
    returnRequest: { count: vi.fn().mockResolvedValue(0), create },
  } as never;
  return { db, create };
};

describe("motifs de retour : photos obligatoires", () => {
  const damaged = { id: "rr_damaged", fr: "Article reçu endommagé", requiresPhotos: true };
  const small = { id: "rr_too_small", fr: "Article trop petit", requiresPhotos: false };
  it("refuse sans photo pour un motif à photos obligatoires", async () => {
    const { db, create } = mkReturn(damaged);
    expect(await requestReturn(db, "u1", "s1", "", now, [], "rr_damaged")).toEqual({ ok: false, error: "photos_required" });
    expect(create).not.toHaveBeenCalled();
  });
  it("accepte avec photo et enregistre le motif", async () => {
    const { db, create } = mkReturn(damaged);
    expect((await requestReturn(db, "u1", "s1", "Déchiré", now, ["m1"], "rr_damaged")).ok).toBe(true);
    expect(create.mock.calls[0][0].data).toMatchObject({ reasonId: "rr_damaged", reason: "Article reçu endommagé — Déchiré" });
  });
  it("accepte sans photo pour un motif sans exigence", async () => {
    const { db } = mkReturn(small, 0);
    expect((await requestReturn(db, "u1", "s1", "", now, [], "rr_too_small")).ok).toBe(true);
  });
  it("refuse un motif inconnu ou désactivé", async () => {
    const { db } = mkReturn(null);
    expect(await requestReturn(db, "u1", "s1", "x", now, ["m1"], "zzz")).toEqual({ ok: false, error: "reason" });
  });
});

describe("configuration : suppressions et transporteurs", () => {
  it("motif de retour lié : suppression refusée", async () => {
    const del = vi.fn().mockResolvedValue({ count: 1 });
    expect(await deleteReturnReason({ returnRequest: { count: vi.fn().mockResolvedValue(1) }, returnReason: { deleteMany: del } } as never, "r")).toBe("used");
    expect(del).not.toHaveBeenCalled();
    expect(await deleteReturnReason({ returnRequest: { count: vi.fn().mockResolvedValue(0) }, returnReason: { deleteMany: del } } as never, "r")).toBe("ok");
  });
  it("transporteur utilisé par un colis : suppression refusée", async () => {
    const del = vi.fn();
    const db = (n: number) => ({ carrier: { findUnique: vi.fn().mockResolvedValue({ id: "c", name: "UPS" }), delete: del }, subOrder: { count: vi.fn().mockResolvedValue(n) } }) as never;
    expect(await deleteCarrier(db(2), "c")).toBe("used");
    expect(del).not.toHaveBeenCalled();
    expect(await deleteCarrier(db(0), "c")).toBe("ok");
  });
  it("ajout : doublon et nom trop court refusés", async () => {
    const db = { carrier: { findUnique: vi.fn().mockResolvedValue({ id: "c" }) } } as never;
    expect(await addCarrier(db, "UPS")).toBe("exists");
    expect(await addCarrier(db, "a")).toBe("invalid");
  });
  it("liste des transporteurs actifs avec repli", async () => {
    const empty = { carrier: { findMany: vi.fn().mockResolvedValue([]) } } as never;
    expect(await activeCarrierNames(empty, ["UPS"])).toEqual(["UPS"]);
    const some = { carrier: { findMany: vi.fn().mockResolvedValue([{ name: "Chronopost" }]) } } as never;
    expect(await activeCarrierNames(some, ["UPS"])).toEqual(["Chronopost"]);
  });
});
