import { describe, expect, it, vi } from "vitest";
import { partnerDecideReturn } from "@/lib/returns";
import { buildReturnEmail } from "@/lib/return-email";
import { PARTNER_RETURN_FILTERS, parseList, partnerReturnsWhere } from "@/lib/admin-list";

function fakeDb(found: boolean, count = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count });
  const findFirst = vi.fn().mockResolvedValue(found ? { id: "r1" } : null);
  return { db: { returnRequest: { findFirst, updateMany } } as never, updateMany, findFirst };
}

describe("décision du créateur sur un retour", () => {
  it("exige un motif pour refuser, sans rien écrire", async () => {
    const { db, updateMany, findFirst } = fakeDb(true);
    expect(await partnerDecideReturn(db, "s1", "sup", "REFUSED", " a ")).toBe("note");
    expect(updateMany).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
  it("seulement sur son colis reçu et non encore décidé", async () => {
    const { db, findFirst } = fakeDb(false);
    expect(await partnerDecideReturn(db, "s1", "sup", "ACCEPTED", "")).toBe("state");
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ status: "RECEIVED", partnerDecision: null, subOrder: { supplierId: "sup" } });
  });
  it("enregistre la décision ; course perdue = état", async () => {
    const ok = fakeDb(true);
    const now = new Date("2026-11-20T10:00:00Z");
    expect(await partnerDecideReturn(ok.db, "s1", "sup", "REFUSED", "rayures", now)).toBe("ok");
    expect(ok.updateMany.mock.calls[0][0].data).toMatchObject({ partnerDecision: "REFUSED", partnerDecisionNote: "rayures", partnerDecidedAt: now });
    expect(await partnerDecideReturn(fakeDb(true, 0).db, "s1", "sup", "ACCEPTED", "")).toBe("state");
  });
  it("e-mails client : texte selon l'état et décision du créateur", () => {
    const b = (kind: never, extra = {}) => buildReturnEmail({ kind, locale: "fr", subNumber: "S1", amountCents: 5500, items: [], ...extra }).lines.join(" ");
    expect(b("received" as never)).toContain("remboursement");
    expect(b("received" as never, { damaged: true })).not.toContain("suit après vérification");
    expect(b("decided_accepted" as never)).toContain("en cours");
    expect(b("decided_refused" as never, { note: "rayures" })).toContain("rayures");
    expect(b("accepted" as never, { shipTo: "Mimi, 1 rue X" })).not.toContain("**");
  });
  it("filtres de liste du créateur", () => {
    const q = (st: string) => parseList({ st }, PARTNER_RETURN_FILTERS, "todo", ["createdAt"], "createdAt");
    const todo = JSON.stringify(partnerReturnsWhere(q("todo"), "sup"));
    expect(todo).toContain('"supplierId":"sup"');
    expect(todo).toContain('"partnerDecision":null');
    expect(JSON.stringify(partnerReturnsWhere(q("refused"), "sup"))).toContain('"partnerDecision":"REFUSED"');
    expect(JSON.stringify(partnerReturnsWhere(q("accepted"), "sup"))).toContain('"partnerDecision":"ACCEPTED"');
  });
});
