import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { deleteReason, findActiveReason, isKind, reasonLabel, setReasonActive } from "@/lib/refusal-reasons";

const row = { id: "r1", kind: "ORDER", fr: "La pièce n'est plus disponible", en: "The piece is no longer available", mailFr: "", mailEn: "", position: 0, active: true };

describe("motifs de refus", () => {
  it("valide le type", () => {
    expect(isKind("ORDER")).toBe(true);
    expect(isKind("x")).toBe(false);
  });
  it("refuse un motif inconnu ou d'un autre type", async () => {
    const db = { refusalReason: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient;
    expect(await findActiveReason(db, "ORDER", "zzz")).toBeNull();
    expect(await findActiveReason(db, "ORDER", undefined)).toBeNull();
  });
  it("suppression refusée si une commande ou un retour est lié, autorisée sinon", async () => {
    const mk = (orders: number, returns: number) => ({ subOrder: { count: vi.fn().mockResolvedValue(orders) }, returnRequest: { count: vi.fn().mockResolvedValue(returns) }, refusalReason: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) } });
    const used = mk(1, 0), usedRet = mk(0, 2), free = mk(0, 0);
    expect(await deleteReason(used as never, "r1")).toBe("used");
    expect(await deleteReason(usedRet as never, "r1")).toBe("used");
    expect(used.refusalReason.deleteMany).not.toHaveBeenCalled();
    expect(await deleteReason(free as never, "r1")).toBe("ok");
  });
  it("désactivation : ne touche que le motif, jamais les commandes existantes ; le mail garde la phrase", async () => {
    const update = vi.fn().mockResolvedValue({ count: 1 });
    const sub = vi.fn();
    const db = { refusalReason: { updateMany: update, findUnique: vi.fn().mockResolvedValue({ ...row, mailFr: "Le créateur ne peut pas respecter le délai prévu.", mailEn: "" }) }, subOrder: { updateMany: sub } } as unknown as PrismaClient;
    await setReasonActive(db, "r1", false);
    expect(update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { active: false } });
    expect(sub).not.toHaveBeenCalled();
    expect(await reasonLabel(db, "r1", "fr")).toBe("Le créateur ne peut pas respecter le délai prévu");
    expect(await reasonLabel(db, "r1", "en")).toBe(row.en);
  });
  it("libellé client selon la langue, rien sans motif", async () => {
    const db = { refusalReason: { findUnique: vi.fn().mockResolvedValue(row) } } as unknown as PrismaClient;
    expect(await reasonLabel(db, "r1", "en")).toBe(row.en);
    expect(await reasonLabel(db, null, "fr")).toBeNull();
  });
});
