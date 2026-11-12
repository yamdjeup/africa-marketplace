import { describe, expect, it } from "vitest";
import { buildPartnerCancelEmail } from "@/lib/partner-cancel-email";

describe("e-mail d'annulation au partenaire", () => {
  it("annulation admin : motif, n° de colis, lien", () => {
    const e = buildPartnerCancelEmail({ shop: "Mimi", number: "AM-1-1", reason: "Rupture", kind: "ADMIN", url: "https://epomta.com/fr/fournisseur/commandes/x", amount: "50,00 €" });
    expect(e.subject).toContain("AM-1-1");
    expect(e.html).toContain("Rupture");
    expect(e.html).toContain("https://epomta.com/fr/fournisseur/commandes/x");
  });
  it("expiration 48 h : message automatique", () => {
    const e = buildPartnerCancelEmail({ shop: "Mimi", number: "AM-1-1", reason: "", kind: "EXPIRED", url: "u", amount: "50,00 €" });
    expect(e.html).toContain("48 h");
  });
});
