import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("Tílá : limitation de débit (base de test)", () => {
  let db: PrismaClient;
  const tag = `T${Date.now().toString(36)}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
  });
  afterAll(async () => {
    if (db) await db.tilaRateHit.deleteMany({ where: { key: { startsWith: tag } } });
  });

  it("refuse au-delà du plafond, rouvre quand la fenêtre est passée, et sépare les clés", async () => {
    const { consume } = await import("@/lib/tila/rate-limit");
    const now = new Date();
    for (let i = 0; i < 3; i++) expect(await consume(db, `${tag}-a`, 3, 60_000, now)).toBe(true);
    expect(await consume(db, `${tag}-a`, 3, 60_000, now)).toBe(false);
    expect(await consume(db, `${tag}-b`, 3, 60_000, now)).toBe(true);
    expect(await consume(db, `${tag}-a`, 3, 60_000, new Date(now.getTime() + 61_000))).toBe(true);
  });
});
