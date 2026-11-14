import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

describe.skipIf(!enabled)("rappel à 24 h : colis encore « Acceptée » (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let owner: string;
  let supplierId: string;
  let n = 0;

  const makeSub = async (status: string, acceptedHoursAgo: number) => {
    const num = `AM-R${tag}${++n}`;
    const order = await db.order.create({ data: { userId: owner, number: num, locale: "fr", email: "client@test.example", fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", totalCents: 5000 } });
    return db.subOrder.create({ data: { orderId: order.id, supplierId, number: `${num}-1`, status, subtotalCents: 5000, acceptBy: new Date(Date.now() + 24 * 3_600_000), decidedAt: new Date(Date.now() - acceptedHoursAgo * 3_600_000) } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36).toUpperCase();
    owner = (await db.user.create({ data: { email: `rem-${tag}@test.example`, name: "Owner", passwordHash: "x" } })).id;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.subOrder.deleteMany({ where: { number: { startsWith: `AM-R${tag}` } } });
    await db.order.deleteMany({ where: { number: { startsWith: `AM-R${tag}` } } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
    await db.user.delete({ where: { id: owner } }).catch(() => undefined);
  });

  it("rappel unique à 24 h, sans annulation ; ni récent, ni déjà préparé", async () => {
    const { sweepPrepReminders } = await import("@/lib/suborders");
    const late = await makeSub("ACCEPTED", 25);
    const recent = await makeSub("ACCEPTED", 5);
    const prepared = await makeSub("PREPARING", 30);
    const ids = (r: { id: string }[]) => r.map((s) => s.id);

    const first = ids(await sweepPrepReminders(db));
    expect(first).toContain(late.id);
    expect(first).not.toContain(recent.id);
    expect(first).not.toContain(prepared.id);

    expect(ids(await sweepPrepReminders(db))).not.toContain(late.id);
    const after = await db.subOrder.findUniqueOrThrow({ where: { id: late.id } });
    expect(after.status).toBe("ACCEPTED");
    expect(after.refundStatus).toBe("");
    expect(after.prepReminderSentAt).not.toBeNull();
  });
});
