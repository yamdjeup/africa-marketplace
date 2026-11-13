import { describe, expect, it } from "vitest";
import { moveItem } from "@/lib/move-item";

import { stockTabOf } from "@/lib/stock-list";
describe("onglet Stocks/Journal", () => {
  it("parse tab : journal sinon stock", () => {
    expect(stockTabOf("journal")).toBe("journal");
    expect(stockTabOf("x")).toBe("stock");
    expect(stockTabOf(undefined)).toBe("stock");
  });
});

describe("réordonnancement des photos", () => {
  it("monte, descend, ignore les bornes et ne mute pas", () => {
    const a = ["a", "b", "c"];
    expect(moveItem(a, 2, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(a, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(a, 0, -1)).toEqual(a);
    expect(moveItem(a, 2, 3)).toEqual(a);
    expect(a).toEqual(["a", "b", "c"]);
  });
  it("glisser la 1re vignette en dernière position (dépôt) conserve toutes les photos", () => {
    const r = moveItem(["a", "b", "c", "d"], 0, 3);
    expect(r).toEqual(["b", "c", "d", "a"]);
    expect([...r].sort()).toEqual(["a", "b", "c", "d"]);
  });
  it("réordonnancement en direct : déplacements successifs conservent les photos", () => {
    let l = ["a", "b", "c", "d"];
    for (const to of [1, 2, 3, 1]) l = moveItem(l, l.indexOf("a"), to);
    expect(l.indexOf("a")).toBe(1);
    expect([...l].sort()).toEqual(["a", "b", "c", "d"]);
  });
  it("la 1re position devient la couverture", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)[0]).toBe("c");
  });
});
