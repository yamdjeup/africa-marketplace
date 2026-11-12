import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";
import type { HoldPayload } from "@/lib/checkout-hold";

// Paiement avant commande : réservation de 30 min, commande créée seulement au paiement (base jetable TEST_DATABASE_URL, jamais la production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("réservation de paiement (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let supplierId: string;
  let slug: string;
  let n = 0;
  const num = () => `AM-H${tag}${++n}`;

  const payload = (email: string, quantity = 1): HoldPayload => ({
    locale: "fr", email, userId: null, fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", phone: "0102030405",
    street: "1 rue Test", houseNumber: "1", box: null, complement: null, editToken: `tok-${tag}-${n}`, totalCents: 5000 * quantity,
    lines: [{ slug, name: `Pièce ${tag}`, size: null, quantity, unitPriceCents: 5000, supplierId }],
  });
  const product = () => db.product.findUniqueOrThrow({ where: { slug } });

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36).toUpperCase();
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-hold" }, update: {}, create: { slug: "test-hold", name: "Test", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/x.png", sourceUrl: "x" } });
    slug = `hold-${tag.toLowerCase()}`;
    await db.product.create({ data: { slug, name: `Pièce ${tag}`, nameEn: `Piece ${tag}`, description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-hold", creatorSlug: "test-hold", priceCents: 5000, materials: [], sizes: [], images: [], stock: 1, supplierId } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.checkoutHold.deleteMany({ where: { number: { startsWith: `AM-H${tag}` } } });
    await db.subOrder.deleteMany({ where: { number: { startsWith: `AM-H${tag}` } } });
    await db.order.deleteMany({ where: { number: { startsWith: `AM-H${tag}` } } });
    await db.stockMovement.deleteMany({ where: { productSlug: slug } });
    await db.product.deleteMany({ where: { slug } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
  });

  it("réserver ne crée aucune commande ; la libération rend le stock", async () => {
    const { createHold, releaseHold } = await import("@/lib/checkout-hold");
    const number = num();
    await createHold(db, payload("a@test.example"), number);
    expect((await product()).reserved).toBe(1);
    expect(await db.order.count({ where: { number } })).toBe(0);
    expect(await releaseHold(db, number)).toBe(true);
    expect(await releaseHold(db, number)).toBe(false);
    expect((await product()).reserved).toBe(0);
    expect(await db.order.count({ where: { number } })).toBe(0);
  });

  it("retour arrière puis reconfirmation du même acheteur : jamais « plus disponible »", async () => {
    const { createHold } = await import("@/lib/checkout-hold");
    await createHold(db, payload("same@test.example"), num());
    const second = num();
    await createHold(db, payload("Same@Test.example"), second);
    expect((await product()).reserved).toBe(1);
    expect((await db.checkoutHold.findUniqueOrThrow({ where: { number: second } })).status).toBe("HELD");
    const { releaseBuyerHolds, buyerKeyOf } = await import("@/lib/checkout-hold");
    await releaseBuyerHolds(db, buyerKeyOf(null, "same@test.example"));
    expect((await product()).reserved).toBe(0);
  });

  it("autre acheteur : erreur de stock nominative", async () => {
    const { createHold, releaseBuyerHolds, buyerKeyOf, StockError } = await import("@/lib/checkout-hold");
    await createHold(db, payload("one@test.example"), num());
    await expect(createHold(db, payload("two@test.example"), num())).rejects.toMatchObject({ item: `Pièce ${tag}` });
    await expect(createHold(db, payload("two@test.example"), num())).rejects.toBeInstanceOf(StockError);
    await releaseBuyerHolds(db, buyerKeyOf(null, "one@test.example"));
  });

  it("paiement : commande + colis créés une seule fois (idempotent)", async () => {
    const { createHold, consumeHold } = await import("@/lib/checkout-hold");
    const number = num();
    await createHold(db, payload("pay@test.example"), number);
    const r = await Promise.all([consumeHold(db, number, "pi_test_1"), consumeHold(db, number, "pi_test_1")]);
    expect(r.filter((x) => x.status === "created")).toHaveLength(1);
    expect(await db.order.count({ where: { number } })).toBe(1);
    expect(await db.subOrder.count({ where: { order: { number } } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { number } })).paymentPending).toBe(false);
    expect((await product()).reserved).toBe(1);
    const sub = await db.subOrder.findFirstOrThrow({ where: { order: { number } } });
    const { cancelSub } = await import("@/lib/suborders");
    await cancelSub(db, sub.id, "test", { label: "test" });
    expect((await product()).reserved).toBe(0);
  });

  it("paiement après libération (session expirée) : stock réservé à nouveau, sinon aucune commande (remboursement)", async () => {
    const { createHold, releaseHold, consumeHold } = await import("@/lib/checkout-hold");
    const a = num();
    await createHold(db, payload("late@test.example"), a);
    await releaseHold(db, a);
    const out = await consumeHold(db, a, "pi_test_2");
    expect(out.status).toBe("created");
    const b = num();
    const taken = await createHold(db, payload("x@test.example"), b).catch((e) => e);
    expect(taken).toBeInstanceOf(Error);
    const c = num();
    await db.checkoutHold.create({ data: { number: c, buyerKey: "e:y@test.example", payload: payload("y@test.example") as never, status: "RELEASED", expiresAt: new Date() } });
    const refused = await consumeHold(db, c, "pi_test_3");
    expect(refused).toMatchObject({ status: "nostock", item: `Pièce ${tag}` });
    expect(await db.order.count({ where: { number: c } })).toBe(0);
    expect((await db.checkoutHold.findUniqueOrThrow({ where: { number: c } })).status).toBe("REFUNDED");
    const sub = await db.subOrder.findFirstOrThrow({ where: { order: { number: a } } });
    const { cancelSub } = await import("@/lib/suborders");
    await cancelSub(db, sub.id, "test", { label: "test" });
  });

  it("balayage : réservations de plus de 30 min libérées sans trace de commande", async () => {
    const { createHold, releaseExpiredHolds } = await import("@/lib/checkout-hold");
    const number = num();
    await createHold(db, payload("old@test.example"), number, new Date(Date.now() - 45 * 60000));
    expect(await releaseExpiredHolds(db)).toBeGreaterThanOrEqual(1);
    expect((await product()).reserved).toBe(0);
    expect(await db.order.count({ where: { number } })).toBe(0);
  });
});
