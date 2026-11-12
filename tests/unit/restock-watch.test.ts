import { describe, expect, it } from "vitest";
import { buildRestockEmail } from "../../src/lib/restock-watch";

describe("A-F21 e-mail pièce de nouveau disponible", () => {
  it("FR : titre, lien fiche, mention de non-garantie", () => {
    const m = buildRestockEmail({ locale: "fr", name: "Bague Soleil", slug: "bague-soleil", priceLabel: "120,00 €" });
    expect(m.html).toContain("Votre pièce est de nouveau disponible");
    expect(m.html).toContain("/fr/produits/bague-soleil");
    expect(m.text).toContain("n'est pas garantie");
  });
  it("EN", () => {
    const m = buildRestockEmail({ locale: "en", name: "Sun ring", slug: "bague-soleil", priceLabel: "€120.00" });
    expect(m.html).toContain("available again");
    expect(m.text).toContain("not guaranteed");
  });
});
