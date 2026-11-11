import { describe, expect, it } from "vitest";
import { showShippedNotice } from "@/lib/returns";
describe("avis colis expédié", () => {
  it("masqué si un retour existe (remboursé, refusé, en cours)", () => { expect(showShippedNotice("DELIVERED", true)).toBe(false); });
  it("affiché sinon", () => { expect(showShippedNotice("SHIPPED", false)).toBe(true); expect(showShippedNotice("PENDING", false)).toBe(false); });
});
