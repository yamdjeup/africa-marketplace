import { describe, expect, it } from "vitest";
import { cartQuantity } from "@/components/marketplace/add-to-cart";

describe("cartQuantity (A-T33)", () => {
  const lines = [
    { slug: "p1", size: null, quantity: 1 },
    { slug: "p2", size: "M", quantity: 2 },
    { slug: "p2", size: "L", quantity: 1 },
  ];
  it("pièce unique déjà au panier : quantité 1 (bouton désactivé après rechargement)", () => {
    expect(cartQuantity(lines, "p1", null, false)).toBe(1);
  });
  it("pièce absente : 0", () => {
    expect(cartQuantity(lines, "p3", null, false)).toBe(0);
  });
  it("variantes : compte par taille ; stock > 1 : désactivé seulement à la quantité max", () => {
    expect(cartQuantity(lines, "p2", "M", true)).toBe(2);
    expect(cartQuantity(lines, "p2", null, true)).toBe(0);
  });
});
