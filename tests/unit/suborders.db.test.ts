import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

// Tests d'intégration sur la base jetable (TEST_DATABASE_URL, garde-fou anti-production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
let currentUser: string | undefined;

vi.mock("@/auth", () => ({ auth: async () => (currentUser ? { user: { id: currentUser, email: `${currentUser}@test.example` } } : null) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/order-notify", () => ({ notifySubOrder: async () => undefined }));
vi.mock("@/lib/supplier-email", () => ({ safeSend: async () => undefined }));

describe.skipIf(!enabled)("colis : annulation, expiration, droits (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let owner: string;
  let stranger: string;
  let supplierId: string;
  let n = 0;

  const makeSub = async (status = "PENDING", hoursAgo = 0) => {
    const num = `AM-T${tag}${++n}`;
    const order = await db.order.create({ data: { userId: owner, number: num, locale: "fr", email: "client@test.example", fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", totalCents: 5000 } });
    const created = new Date(Date.now() - hoursAgo * 3_600_000);
    return db.subOrder.create({ data: { orderId: order.id, supplierId, number: `${num}-1`, status, subtotalCents: 5000, acceptBy: new Date(created.getTime() + 48 * 3_600_000) } });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36).toUpperCase();
    owner = (await db.user.create({ data: { email: `owner-${tag}@test.example`, name: "Owner", passwordHash: "x" } })).id;
    stranger = (await db.user.create({ data: { email: `other-${tag}@test.example`, name: "Other", passwordHash: "x" } })).id;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.subOrder.deleteMany({ where: { number: { startsWith: `AM-T${tag}` } } });
    await db.order.deleteMany({ where: { number: { startsWith: `AM-T${tag}` } } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
    await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
  });

  it("double annulation concurrente : une seule réussit", async () => {
    const { cancelSub } = await import("@/lib/suborders");
    const s = await makeSub();
    const r = await Promise.all([1, 2, 3].map(() => cancelSub(db, s.id, "test", { label: "test" })));
    expect(r.filter(Boolean)).toHaveLength(1);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("CANCELLED");
  });

  it("annulation impossible une fois expédié", async () => {
    const { cancelSub } = await import("@/lib/suborders");
    const s = await makeSub("SHIPPED");
    expect(await cancelSub(db, s.id, "test", { label: "test" })).toBeNull();
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("SHIPPED");
  });

  it("expiration à 48 h : colis en retard expiré, colis récent conservé", async () => {
    const { sweepSubOrders } = await import("@/lib/suborders");
    const late = await makeSub("PENDING", 49);
    const fresh = await makeSub("PENDING", 2);
    const r = await sweepSubOrders(db);
    expect(r.expired.map((x) => x.id)).toContain(late.id);
    expect(r.expired.map((x) => x.id)).not.toContain(fresh.id);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: late.id } })).status).toBe("EXPIRED");
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe("PENDING");
    expect((await sweepSubOrders(db)).expired.map((x) => x.id)).not.toContain(late.id);
  });

  it("droits : un autre client ou un visiteur ne peut pas annuler", async () => {
    const { cancelMySubOrder } = await import("../../src/app/[locale]/account/orders/cancel-actions");
    const s = await makeSub();
    const fd = new FormData();
    fd.set("id", s.id);
    currentUser = stranger;
    await cancelMySubOrder(fd);
    currentUser = undefined;
    await cancelMySubOrder(fd);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("PENDING");
  });

  it("droits : le propriétaire annule (remboursement manuel sans paiement Stripe)", async () => {
    const { cancelMySubOrder } = await import("../../src/app/[locale]/account/orders/cancel-actions");
    const s = await makeSub();
    const fd = new FormData();
    fd.set("id", s.id);
    currentUser = owner;
    await cancelMySubOrder(fd);
    const after = await db.subOrder.findUniqueOrThrow({ where: { id: s.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.refundStatus).toBe("MANUAL");
  });

  it("refus avant confirmation du paiement : remboursement en attente (AWAITING)", async () => {
    const { refuseSub } = await import("@/lib/suborders");
    const { settleSubRefund } = await import("@/lib/refund");
    const s = await makeSub();
    await db.order.update({ where: { id: s.orderId }, data: { paymentPending: true } });
    await refuseSub(db, s.id, supplierId, "indisponible", { label: "test" });
    await settleSubRefund(s.id);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: s.id } })).refundStatus).toBe("AWAITING");
  });
});
