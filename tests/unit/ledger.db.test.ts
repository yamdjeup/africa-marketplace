import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("registre des gains et versements (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let owner: string;
  let supplierId: string;
  let n = 0;

  const makeSub = async (subtotalCents: number) => {
    const num = `AM-L${tag}${++n}`;
    const order = await db.order.create({ data: { userId: owner, number: num, locale: "fr", email: "client@test.example", fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", totalCents: subtotalCents } });
    return db.subOrder.create({ data: { orderId: order.id, supplierId, number: `${num}-1`, status: "DELIVERED", subtotalCents, acceptBy: new Date() } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    process.env.LEDGER_HOLD_DAYS = "7";
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36).toUpperCase();
    owner = (await db.user.create({ data: { email: `led-${tag}@test.example`, name: "Owner", passwordHash: "x" } })).id;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.ledgerEntry.deleteMany({ where: { supplierId } });
    await db.payout.deleteMany({ where: { supplierId } });
    await db.subOrder.deleteMany({ where: { number: { startsWith: `AM-L${tag}` } } });
    await db.order.deleteMany({ where: { number: { startsWith: `AM-L${tag}` } } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
    await db.user.delete({ where: { id: owner } }).catch(() => undefined);
  });

  it("H-16 : commission 15 %, gain en attente 7 jours, disponible ensuite, versé une seule fois", async () => {
    const { recordDelivery, balances, createPayout } = await import("@/lib/ledger");
    const now = new Date();
    const sub = await makeSub(200_000);

    const entry = await recordDelivery(db, sub, now);
    expect([entry.grossCents, entry.commissionCents, entry.netCents]).toEqual([200_000, 30_000, 170_000]);
    // idempotent : une seconde livraison n'ajoute rien
    await recordDelivery(db, sub, now);
    expect(await db.ledgerEntry.count({ where: { subOrderId: sub.id } })).toBe(1);

    expect(await balances(db, supplierId, now)).toMatchObject({ pending: 170_000, available: 0, paid: 0 });
    expect(await createPayout(db, supplierId, "admin@test.example", now)).toBeNull();

    const later = new Date(now.getTime() + 8 * 86_400_000);
    expect(await balances(db, supplierId, later)).toMatchObject({ pending: 0, available: 170_000, paid: 0 });

    const payout = await createPayout(db, supplierId, "admin@test.example", later);
    expect(payout?.amountCents).toBe(170_000);
    expect(payout?.reference).toMatch(/^TEST-/);
    expect(await balances(db, supplierId, later)).toMatchObject({ pending: 0, available: 0, paid: 170_000 });
    expect(await createPayout(db, supplierId, "admin@test.example", later)).toBeNull();
  });

  it("H-16 : une nouvelle commission ne touche que les livraisons suivantes", async () => {
    const { recordDelivery } = await import("@/lib/ledger");
    const before = await db.ledgerEntry.findFirstOrThrow({ where: { supplierId } });
    await db.supplier.update({ where: { id: supplierId }, data: { commissionRate: 0.25 } });
    const next = await recordDelivery(db, await makeSub(10_000));
    expect([next.commissionRate, next.commissionCents, next.netCents]).toEqual([0.25, 2_500, 7_500]);
    const same = await db.ledgerEntry.findUniqueOrThrow({ where: { id: before.id } });
    expect(same.commissionRate).toBe(0.15);
  });
});
