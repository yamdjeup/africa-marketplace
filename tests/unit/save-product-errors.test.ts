import { describe, expect, it } from "vitest";
import { splitImageUrls } from "@/lib/image-urls";
import { productErrorMessage } from "@/lib/product-errors";

describe("splitImageUrls", () => {
  const legacy = ["/images/exemple/a.jpg", "https://cdn.example.org/b.jpg"];
  it("conserve les images existantes hors /api/media", () => {
    const r = splitImageUrls(JSON.stringify(legacy), 6, legacy);
    expect(r.urls).toEqual(legacy);
    expect(r.media).toEqual([]);
  });
  it("écarte les URL externes non attachées et garde /api/media à vérifier", () => {
    const r = splitImageUrls(JSON.stringify(["https://evil.test/x.jpg", "/api/media/abc-1"]), 6, []);
    expect(r.urls).toEqual(["/api/media/abc-1"]);
    expect(r.media).toEqual(["/api/media/abc-1"]);
  });
  it("tolère un JSON invalide", () => {
    expect(splitImageUrls("nope", 6, legacy).urls).toEqual([]);
  });
});

describe("productErrorMessage", () => {
  it("donne un message distinct par code, FR et EN", () => {
    const codes = ["invalid", "price", "photo", "desc", "readonly"];
    const fr = codes.map((c) => productErrorMessage(c, "fr"));
    expect(new Set(fr).size).toBe(codes.length);
    expect(fr.every((m) => !m.startsWith("Action impossible"))).toBe(true);
    expect(productErrorMessage("photo", "en")).toMatch(/photo/);
    expect(productErrorMessage("zzz", "fr")).toMatch(/^Action impossible/);
  });
});
