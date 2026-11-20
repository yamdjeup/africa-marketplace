import { describe, expect, it } from "vitest";
import { buildCarrierOptions, filterCarriers, OTHER_CARRIER } from "../../mobile/carriers";

describe("return carrier list", () => {
  const opts = buildCarrierOptions();
  it("puts popular carriers first and Autre last, without duplicates", () => {
    expect(opts.length).toBeGreaterThan(1000);
    expect(opts[opts.length - 1].id).toBe(OTHER_CARRIER);
    expect(opts.slice(0, 6).map((o) => o.label.toLowerCase()).join("|")).toMatch(/dhl.*\|ups.*\|colissimo.*\|la poste.*\|fedex.*\|chronopost/);
    const lower = opts.map((o) => o.label.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
  it("filters while typing, accent/case-insensitive, always offering Autre", () => {
    const r = filterCarriers(opts, "colis");
    expect(r.length).toBeGreaterThan(1);
    expect(r[0].label.toLowerCase()).toContain("colis");
    expect(r.some((o) => o.id === OTHER_CARRIER)).toBe(true);
    expect(filterCarriers(opts, "zzzzqqq").map((o) => o.id)).toEqual([OTHER_CARRIER]);
    expect(filterCarriers(opts, "").length).toBeLessThanOrEqual(51);
  });
});
