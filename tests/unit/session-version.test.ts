import { describe, expect, it } from "vitest";
import { sessionVersionValid } from "@/lib/session-version";

describe("sessionVersionValid", () => {
  it("accepte une version identique, y compris un ancien jeton sans version face à 0", () => {
    expect(sessionVersionValid(2, 2)).toBe(true);
    expect(sessionVersionValid(undefined, 0)).toBe(true);
  });
  it("refuse après réinitialisation, jeton ancien ou compte supprimé", () => {
    expect(sessionVersionValid(0, 1)).toBe(false);
    expect(sessionVersionValid(undefined, 1)).toBe(false);
    expect(sessionVersionValid("1", 1)).toBe(false);
    expect(sessionVersionValid(1, null)).toBe(false);
  });
});
