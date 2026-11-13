import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  it("tous les affichages du numéro (compte, admin, partenaire, e-mails) passent par cleanTrackingNumber", () => {
    const files = [
      "src/components/marketplace/sub-order-tracking.tsx",
      "src/lib/order-notify.ts",
      "src/app/[locale]/admin/commandes/page.tsx",
      "src/app/[locale]/admin/commandes/[id]/page.tsx",
      "src/app/[locale]/fournisseur/(portal)/commandes/[id]/page.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(resolve(import.meta.dirname, "../..", f), "utf8");
      expect(src, f).toContain("cleanTrackingNumber(");
      expect(src, f).not.toMatch(/\{(s|sub)\.trackingNumber\}/);
      expect(src, f).not.toMatch(/\$\{(s|sub)\.trackingNumber\}/);
    }
  });
  it("numéro vide après nettoyage : pas de lien", () => {
    expect(trackingUrl("UPS", " , ; ")).toBeNull();
  });
});
