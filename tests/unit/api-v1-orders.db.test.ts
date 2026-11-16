import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// Commandes mobile : détail des colis, annulation et retour réservés au propriétaire (base jetable TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile commandes : colis, annulation, retour (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let owner: string;
  let other: string;
  let supplierId: string;
  let n = 0;

  const makeSub = async (status: string, deliveredDaysAgo?: number) => {
    const num = `AM-O${tag}${++n}`;
    const order = await db.order.create({ data: { userId: owner, number: num, locale: "fr", email: "client@test.example", fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", totalCents: 5000 } });
    const deliveredAt = deliveredDaysAgo === undefined ? null : new Date(Date.now() - deliveredDaysAgo * 86_400_000);
    return db.subOrder.create({ data: { orderId: order.id, supplierId, number: `${num}-1`, status, subtotalCents: 5000, acceptBy: new Date(Date.now() + 24 * 3_600_000), deliveredAt } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36).toUpperCase();
    owner = (await db.user.create({ data: { email: `ord-${tag}@test.example`, name: "Owner", passwordHash: "x" } })).id;
    other = (await db.user.create({ data: { email: `oth-${tag}@test.example`, name: "Other", passwordHash: "x" } })).id;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.returnRequest.deleteMany({ where: { subOrder: { number: { startsWith: `AM-O${tag}` } } } });
    await db.subOrder.deleteMany({ where: { number: { startsWith: `AM-O${tag}` } } });
    await db.order.deleteMany({ where: { number: { startsWith: `AM-O${tag}` } } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
    await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
  });

  it("listOrders expose boutique, droits d'annulation et de retour", async () => {
    const { listOrders } = await import("@/lib/mobile-checkout");
    const pending = await makeSub("PENDING");
    const delivered = await makeSub("DELIVERED", 2);
    const parcels = (await listOrders(owner)).flatMap((o) => o.parcels);
    const p = parcels.find((x) => x.id === pending.id)!;
    const d = parcels.find((x) => x.id === delivered.id)!;
    expect(p.canCancel).toBe(true);
    expect(p.canReturn).toBe(false);
    expect(p.shop?.country).toBe("CM");
    expect(d.canCancel).toBe(false);
    expect(d.canReturn).toBe(true);
  });

  it("annulation : refusée à un autre client, acceptée au propriétaire", async () => {
    const { cancelParcelForUser } = await import("@/lib/customer-orders");
    const sub = await makeSub("PENDING");
    expect(await cancelParcelForUser(other, null, sub.id)).toBe(false);
    expect(await cancelParcelForUser(owner, null, sub.id)).toBe(true);
    expect((await db.subOrder.findUnique({ where: { id: sub.id } }))?.status).toBe("CANCELLED");
  });

  it("retour : motif obligatoire, une seule demande, propriétaire uniquement", async () => {
    const { requestReturnForUser } = await import("@/lib/customer-orders");
    const sub = await makeSub("DELIVERED", 1);
    expect((await requestReturnForUser(other, null, sub.id, "Trop petit")).ok).toBe(false);
    expect((await requestReturnForUser(owner, null, sub.id, "x")).ok).toBe(false);
    expect((await requestReturnForUser(owner, null, sub.id, "Trop petit")).ok).toBe(true);
    expect((await requestReturnForUser(owner, null, sub.id, "Trop petit")).ok).toBe(false);
  });
});
