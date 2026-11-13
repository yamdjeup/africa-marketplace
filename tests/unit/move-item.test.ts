import { describe, expect, it } from "vitest";
import { moveItem } from "@/lib/move-item";

describe("réordonnancement des photos", () => {
  it("monte, descend, ignore les bornes et ne mute pas", () => {
    const a = ["a", "b", "c"];
    expect(moveItem(a, 2, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(a, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(a, 0, -1)).toEqual(a);
    expect(moveItem(a, 2, 3)).toEqual(a);
    expect(a).toEqual(["a", "b", "c"]);
  });
  it("la 1re position devient la couverture", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)[0]).toBe("c");
  });
});
