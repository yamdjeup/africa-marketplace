import { describe, expect, it } from "vitest";
import { showHoldNotice } from "@/lib/hold-notice";

describe("avis reservee par un autre client", () => {
  it("masque l'avis s'il reste du stock disponible (stock 8, reserve 1)", () => {
    expect(showHoldNotice({ soldOut: false, reserved: 1, ownHold: false })).toBe(false);
  });
  it("affiche l'avis si plus rien n'est disponible et qu'une reservation existe", () => {
    expect(showHoldNotice({ soldOut: true, reserved: 1, ownHold: false })).toBe(true);
  });
  it("pas d'avis si epuise sans reservation ou si la reservation est la sienne", () => {
    expect(showHoldNotice({ soldOut: true, reserved: 0, ownHold: false })).toBe(false);
    expect(showHoldNotice({ soldOut: true, reserved: 1, ownHold: true })).toBe(false);
  });
});
