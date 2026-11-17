import { describe, expect, it, vi } from "vitest";
import { markReturnReceivedByPartner, partnerCheckDeadline } from "@/lib/returns";

function fakeDb(found: boolean, count = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count });
  const findFirst = vi.fn().mockResolvedValue(found ? { id: "r1" } : null);
  return { db: { returnRequest: { findFirst, updateMany } } as never, updateMany, findFirst };
}

describe("contrôle du colis retour par le créateur", () => {
  it("exige un commentaire si endommagé, sans rien écrire", async () => {
    const { db, updateMany } = fakeDb(true);
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "DAMAGED", "  ")).toBe("note");
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("refuse un colis qui n'est pas au créateur ou pas « accepté »", async () => {
    const { db, findFirst } = fakeDb(false);
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "OK", "")).toBe("state");
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ status: "ACCEPTED", subOrder: { supplierId: "sup" } });
  });
  it("passe en reçu avec état et commentaire ; délai de 6 jours", async () => {
    const { db, updateMany } = fakeDb(true);
    const now = new Date("2026-11-17T10:00:00Z");
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "DAMAGED", "rayé", now)).toBe("ok");
    expect(updateMany.mock.calls[0][0].data).toMatchObject({ status: "RECEIVED", condition: "DAMAGED", conditionNote: "rayé", partnerReceivedAt: now });
    expect(partnerCheckDeadline(now).toISOString()).toBe("2026-11-23T10:00:00.000Z");
  });
  it("course perdue : état", async () => {
    const { db } = fakeDb(true, 0);
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "OK", "")).toBe("state");
  });
});
