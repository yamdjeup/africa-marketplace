import { describe, expect, it } from "vitest";
import { stockReason } from "@/lib/checkout-hold";

describe("stockReason (A-T29)", () => {
  it("réservée par un autre client : stock présent mais réservé", () => {
    expect(stockReason({ stock: 1, reserved: 1 }, 1)).toBe("reserved");
  });
  it("épuisée : stock 0", () => {
    expect(stockReason({ stock: 0, reserved: 0 }, 1)).toBe("soldout");
  });
  it("quantité demandée supérieure au stock total : épuisée", () => {
    expect(stockReason({ stock: 1, reserved: 1 }, 2)).toBe("soldout");
  });
});
