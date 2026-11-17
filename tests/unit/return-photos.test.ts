import { describe, expect, it } from "vitest";
import { sniffImage } from "@/lib/image-sniff";
import { parsePhotoIds, storeReturnPhotos } from "@/lib/return-photos";

describe("photos de retour", () => {
  it("reconnaît PNG/JPEG et refuse le reste", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBeTruthy();
    expect(sniffImage(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeFalsy();
  });
  it("parse la liste d'identifiants", () => {
    expect(parsePhotoIds("a,b")).toEqual(["a", "b"]);
    expect(parsePhotoIds("")).toEqual([]);
  });
  it("refuse plus de 5 photos et les fichiers trop lourds", async () => {
    const f = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    const many = await storeReturnPhotos("u", Array(6).fill(f));
    expect(many.ok).toBe(false);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "b.png", { type: "image/png" });
    const r = await storeReturnPhotos("u", [big]);
    expect(r.ok).toBe(false);
  });
});
