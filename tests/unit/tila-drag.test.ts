import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("mobile/tila.tsx", "utf8");

describe("bulle Tílá : déplacement au doigt", () => {
  it("PanResponder créé une seule fois, capture le geste, déplacement par transform", () => {
    expect(src).toMatch(/const pan = useRef\(PanResponder\.create/);
    expect(src).toContain("onMoveShouldSetPanResponderCapture: () => true");
    expect(src).toContain("translateX: pos.x");
    expect(src).not.toMatch(/left: pos\.x/);
  });
});