import { describe, expect, it } from "vitest";
import { INTEREST_MINUTES, INTEREST_POLL_MS } from "@/lib/cart-interest";

describe("sondage intérêt panier (A-T34)", () => {
  it("sondage toutes les 5 s, bien inférieur à la fenêtre de 30 min", () => {
    expect(INTEREST_POLL_MS).toBe(5000);
    expect(INTEREST_POLL_MS).toBeLessThan(INTEREST_MINUTES * 60 * 1000);
  });
});
