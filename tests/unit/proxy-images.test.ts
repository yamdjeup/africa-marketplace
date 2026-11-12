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
  it("ne rouvre pas le reste du site", () => {
    for (const p of ["/fr", "/fr/catalogue", "/images/other/x.jpg", "/images/artworks/../x.jpg", "/api/orders"]) expect(re.test(p)).toBe(false);
  });
});