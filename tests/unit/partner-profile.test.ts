import { describe, expect, it } from "vitest";
import { carrierLabel } from "@/lib/tracking";
import { changeLog, changedFields, validateContact } from "@/lib/partner-profile";

describe("carrierLabel", () => {
  it("traduit « Autre »", () => {
    expect(carrierLabel("Autre", true)).toBe("Autre");
    expect(carrierLabel("Autre", false)).toBe("Other");
    expect(carrierLabel("DHL", false)).toBe("DHL");
  });
});

describe("partner-profile", () => {
  it("valide les coordonnées", () => {
    expect(validateContact({ contactEmail: "a@b.fr", phone: "+33 6 12 34 56 78", address: "1 rue X" })).toBeNull();
    expect(validateContact({ contactEmail: "", phone: "", address: "" })).toBeNull();
    expect(validateContact({ contactEmail: "nope", phone: "", address: "" })).toBe("email");
    expect(validateContact({ contactEmail: "", phone: "abc", address: "" })).toBe("phone");
    expect(validateContact({ contactEmail: "", phone: "", address: "x".repeat(301) })).toBe("address");
  });
  it("journalise champ, ancienne et nouvelle valeur", () => {
    const before = { displayName: "LoliPat", phone: null as string | null };
    const after = { displayName: "Mia-Mia", phone: "" };
    expect(changedFields(before, after)).toEqual(["displayName"]);
    expect(changeLog(before, after)).toBe("displayName : LoliPat → Mia-Mia");
  });
});

