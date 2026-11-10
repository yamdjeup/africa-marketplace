import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

describe("garde-fou TEST_DATABASE_URL", () => {
  const good = "postgresql://test:test@localhost:54329/epomta_test";
  it("accepte une base locale jetable", () => {
    expect(requireTestDatabaseUrl({ TEST_DATABASE_URL: good })).toBe(good);
  });
  it("refuse l'absence d'URL ou une URL non Postgres", () => {
    expect(() => requireTestDatabaseUrl({})).toThrow();
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: "file:./x.db" })).toThrow();
  });
  it("refuse la même base que DATABASE_URL ou DIRECT_URL", () => {
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: good, DATABASE_URL: good })).toThrow(/REFUS/);
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: good, DIRECT_URL: good })).toThrow(/REFUS/);
  });
  it("refuse « prod » et une base distante sans « test »", () => {
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://u:p@localhost/epomta_prod" })).toThrow(/REFUS/);
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/neondb" })).toThrow(/REFUS/);
    expect(requireTestDatabaseUrl({ TEST_DATABASE_URL: "postgresql://u:p@ep-x.neon.tech/epomta_test" })).toContain("epomta_test");
  });
});
