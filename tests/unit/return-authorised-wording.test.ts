import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("vocabulaire retour autorisé", () => {
  it("mail créateur et libellé de statut disent « autorisé » (FR/EN)", async () => {
    const { buildPartnerReturnEmail } = await import("../../src/lib/return-email");
    const { RETURN_LABELS } = await import("../../src/lib/returns");
    const o = { kind: "accepted" as const, partnerName: "Mimi", subNumber: "AM-1-1", amountCents: 100, items: [] };
    const fr = buildPartnerReturnEmail({ ...o, locale: "fr" });
    const en = buildPartnerReturnEmail({ ...o, locale: "en" });
    expect(fr.subject).toContain("retour autorisé");
    expect(fr.lines.join(" ")).toContain("est autorisé");
    expect(fr.html).toContain("Retour autorisé");
    expect(en.subject).toContain("return authorised");
    expect(RETURN_LABELS.ACCEPTED.fr).toBe("Retour autorisé");
  });
});