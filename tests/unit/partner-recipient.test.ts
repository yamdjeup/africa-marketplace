import { describe, expect, it } from "vitest";
import { partnerRecipient } from "@/lib/partner-recipient";

describe("partnerRecipient", () => {
  it("privilégie l'e-mail de contact", () => {
    expect(partnerRecipient({ contactEmail: " contact@x.fr " }, "login@x.fr")).toBe("contact@x.fr");
  });
  it("replie sur l'e-mail du compte si vide", () => {
    expect(partnerRecipient({ contactEmail: null }, "login@x.fr")).toBe("login@x.fr");
    expect(partnerRecipient({ contactEmail: "  " }, "login@x.fr")).toBe("login@x.fr");
  });
  it("renvoie null sans aucune adresse", () => {
    expect(partnerRecipient({}, null)).toBeNull();
  });
});
