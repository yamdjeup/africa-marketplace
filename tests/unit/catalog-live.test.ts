import { describe, expect, it } from "vitest";
import { live } from "@/lib/catalog";
describe("catalogue public", () => {
  it("exclut les œuvres sans partenaire", () => { expect(live).toEqual({ status: "PUBLISHED", supplierId: { not: null } }); });
});
