import { describe, expect, it, vi } from "vitest";
import { markReturnReceivedByPartner, partnerCheckDeadline, partnerConfirmParcelArrived, receiveReturnParcel } from "@/lib/returns";

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
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ subOrder: { supplierId: "sup" }, OR: [{ status: "ACCEPTED" }, { status: "RECEIVED", condition: null, partnerDecision: null }] });
  });
  it("reçu automatiquement (17TRACK) sans état : le créateur peut encore contrôler, sans écraser la date de réception", async () => {
    const { db, updateMany, findFirst } = fakeDb(true);
    const auto = new Date("2026-11-16T09:00:00Z");
    findFirst.mockResolvedValue({ id: "r1", status: "RECEIVED", partnerReceivedAt: auto });
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "OK", "", new Date("2026-11-17T10:00:00Z"))).toBe("checked");
    expect(updateMany.mock.calls[0][0].data).toMatchObject({ condition: "OK", partnerReceivedAt: auto });
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

describe("bouton « J'ai reçu le colis » (créateur)", () => {
  it("même transition que 17TRACK : uniquement « accepté » + retour expédié, sur son colis", async () => {
    const { db, updateMany, findFirst } = fakeDb(true);
    const now = new Date("2026-11-21T10:00:00Z");
    expect(await partnerConfirmParcelArrived(db, "s1", "sup", now)).toBe("ok");
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ subOrderId: "s1", subOrder: { supplierId: "sup" }, status: "ACCEPTED", returnShippedAt: { not: null } });
    expect(updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "r1", status: "ACCEPTED" }, data: { status: "RECEIVED", partnerReceivedAt: now } });
  });
  it("état refusé si pas expédié / pas au créateur / déjà reçu, et pas de double traitement si 17TRACK confirme ensuite", async () => {
    const none = fakeDb(false);
    expect(await partnerConfirmParcelArrived(none.db, "s1", "sup")).toBe("state");
    expect(none.updateMany).not.toHaveBeenCalled();
    const lost = fakeDb(true, 0);
    expect(await partnerConfirmParcelArrived(lost.db, "s1", "sup")).toBe("state");
    expect(await receiveReturnParcel(lost.db, { returnTracking: "T1" })).toBeNull();
  });
  it("le contrôle qui suit ne renvoie pas le mail « reçu »", async () => {
    const { db, findFirst } = fakeDb(true);
    findFirst.mockResolvedValue({ id: "r1", status: "RECEIVED", partnerReceivedAt: new Date() });
    expect(await markReturnReceivedByPartner(db, "s1", "sup", "OK", "")).toBe("checked");
  });
});
