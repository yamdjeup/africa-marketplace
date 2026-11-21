import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workflow sweep", () => {
  const y = readFileSync(".github/workflows/sweep.yml", "utf8");
  it("planifie 15 min, dispatch manuel, secrets (pas d'URL ni secret en dur)", () => {
    expect(y).toContain('cron: "*/15 * * * *"');
    expect(y).toContain("workflow_dispatch");
    expect(y).toContain("secrets.SWEEP_URL");
    expect(y).toContain("secrets.CRON_SECRET");
    expect(y).not.toMatch(/https?:\/\//);
  });
});
