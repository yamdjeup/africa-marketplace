import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots", () => {
  it("bloque toute indexation", () => {
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});