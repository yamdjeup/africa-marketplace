import { describe, expect, it } from "vitest";
import { renderEmailHtml } from "@/lib/email-layout";
describe("e-mail : article cliquable", () => {
  it("lie le nom vers la fiche produit", () => {
    const h = renderEmailHtml({ locale: "fr", title: "T", paragraphs: [], summary: { items: [{ name: "Masque", priceLabel: "5,00 €", url: "https://epomta.com/fr/produits/masque" }], rows: [] } });
    expect(h).toContain('href="https://epomta.com/fr/produits/masque"');
  });
  it("sans url : pas de lien", () => {
    expect(renderEmailHtml({ locale: "en", title: "T", paragraphs: [], summary: { items: [{ name: "Mask", priceLabel: "€5.00" }], rows: [] } })).not.toContain("/produits/");
  });
});
