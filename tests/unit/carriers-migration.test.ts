import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CARRIERS } from "../../mobile/carriers-data";

describe("migration 0040 : transporteurs 17TRACK", () => {
  const sql = readFileSync("prisma/migrations/0040_carriers_17track/migration.sql", "utf8");
  it("insère tous les transporteurs 17TRACK sans écraser l'existant", () => {
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect((sql.match(/\('c17_/g) ?? []).length).toBeGreaterThanOrEqual(CARRIERS.length - 5);
    expect(sql).toContain("'c17_" + CARRIERS[0][0] + "'");
  });
});
