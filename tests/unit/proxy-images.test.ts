import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mur d'accès : images des e-mails", () => {
  const src = readFileSync("src/proxy.ts", "utf8");
  const re = new RegExp(src.match(/const PUBLIC_ALERTS = \/(.*)\/;/)![1]);
  it("exempte /api/media/<id> et /images/artworks/*.jpg", () => {
    expect(re.test("/api/media/abc123")).toBe(true);
    expect(re.test("/images/artworks/taylor-3.jpg")).toBe(true);
    expect(re.test("/images/examples/marjon-lunettes-cristaux.webp")).toBe(true);
  });
  it("laisse le webhook 17TRACK atteindre la route (signature v?rifi?e par la route)", () => {
    expect(re.test("/api/webhooks/17track")).toBe(true);
    expect(re.test("/api/webhooks/autre")).toBe(false);
  });
  it("ne rouvre pas le reste du site", () => {
    for (const p of ["/fr", "/fr/catalogue", "/images/other/x.jpg", "/images/artworks/../x.jpg", "/api/orders"]) expect(re.test(p)).toBe(false);
  });
});

describe("mur d'accès : API mobile", () => {
  const re = new RegExp(readFileSync("src/proxy.ts", "utf8").match(/const PUBLIC_ALERTS = \/(.*)\/;/)![1]);
  it("laisse passer /api/v1/* (Bearer) mais pas le site", () => {
    for (const p of ["/api/v1/auth/profile", "/api/v1/creators", "/api/v1/shop/categories", "/api/v1/supplier/orders/abc", "/api/v1/push/token"]) expect(re.test(p)).toBe(true);
    for (const p of ["/api/v1", "/api/admin/x", "/fr/admin"]) expect(re.test(p)).toBe(false);
  });
});
