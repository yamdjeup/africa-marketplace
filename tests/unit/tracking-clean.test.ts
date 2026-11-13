import { describe, expect, it } from "vitest";
import { cleanTrackingNumber, trackingUrl } from "@/lib/tracking";

describe("numéro de suivi assaini (A-T38)", () => {
  it("retire virgules, points-virgules et espaces", () => {
    expect(cleanTrackingNumber("1Z999AA10123456784,")).toBe("1Z999AA10123456784");
    expect(cleanTrackingNumber(" 1Z999 AA101 23456784 ; ")).toBe("1Z999AA10123456784");
  });
  it("l'URL UPS ne contient plus %2C", () => {
    const u = trackingUrl("UPS", "1Z999AA10123456784,")!;
    expect(u).toBe("https://www.ups.com/track?tracknum=1Z999AA10123456784");
    expect(u).not.toContain("%2C");
  });
  it("numéro vide après nettoyage : pas de lien", () => {
    expect(trackingUrl("UPS", " , ; ")).toBeNull();
  });
});
