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
    await db.cartInterest.deleteMany({ where: { token: { in: ["a-token-aaaaaaaaaaaaaaaa", "b-token-aaaaaaaaaaaaaaaa"] } } });
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

  it("retour arrière Stripe (cancel_url) : jeton valide libère la réservation, mauvais jeton non", async () => {
    const { createHold, cancelHoldWithToken } = await import("@/lib/checkout-hold");
    const number = num();
    const p = payload("c@test.example");
    await createHold(db, p, number);
    expect(await cancelHoldWithToken(db, number, "mauvais")).toBe(false);
    expect((await product()).reserved).toBe(1);
    expect(await cancelHoldWithToken(db, number, p.editToken)).toBe(true);
    expect((await product()).reserved).toBe(0);
  });

  it("intérêt panier (A-T32) : vu par un autre navigateur, jamais par soi-même, expiré après 30 min, retiré avec le panier", async () => {
    const { syncInterest, othersHaveInCart } = await import("@/lib/cart-interest");
    const b = "b-token-aaaaaaaaaaaaaaaa";
    const a = "a-token-aaaaaaaaaaaaaaaa";
    const t0 = new Date();
    await syncInterest(db, b, [slug], t0);
    expect(await othersHaveInCart(db, slug, a, t0)).toBe(true);
    expect(await othersHaveInCart(db, slug, b, t0)).toBe(false);
    expect(await othersHaveInCart(db, slug, a, new Date(t0.getTime() + 31 * 60 * 1000))).toBe(false);
    await syncInterest(db, b, [], t0);
    expect(await othersHaveInCart(db, slug, a, t0)).toBe(false);
  });

  it("retour navigateur (A-T31) : libération répétée idempotente, stock rendu une seule fois", async () => {
    const { createHold, cancelHoldWithToken } = await import("@/lib/checkout-hold");
    const number = num();
    const p = payload("d@test.example");
    await createHold(db, p, number);
    expect(await cancelHoldWithToken(db, number, p.editToken)).toBe(true);
    expect(await cancelHoldWithToken(db, number, p.editToken)).toBe(false);
    expect((await product()).reserved).toBe(0);
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

  it("A-T35 : l'admin ajuste le stock d'une pièce de partenaire ; motif obligatoire, journal avec l'e-mail de l'admin, jamais sous le réservé", async () => {
    const { adminAdjustStock } = await import("@/lib/admin-stock-adjust");
    const admin = { id: "admin-x", email: `admin-${tag}@example.test` };
    const base = { slug, variant: null, admin };
    expect(await adminAdjustStock({ ...base, type: "ADJUST", delta: 2, reason: "  " })).toBe("reason");
    expect(await adminAdjustStock({ ...base, type: "ADJUST", delta: 0, reason: "x" })).toBe("delta");
    expect(await adminAdjustStock({ ...base, slug: "inconnu-xyz", type: "ADJUST", delta: 1, reason: "x" })).toBe("notfound");
    const before = (await product()).stock;
    expect(await adminAdjustStock({ ...base, type: "ENTRY", delta: 3, reason: "Réception atelier" })).toBe("ok");
    expect((await product()).stock).toBe(before + 3);
    const mv = await db.stockMovement.findFirstOrThrow({ where: { productSlug: slug, reason: "Réception atelier" } });
    expect(mv.authorLabel).toBe(admin.email);
    expect(mv.quantity).toBe(3);
    expect(await adminAdjustStock({ ...base, type: "ADJUST", delta: -100, reason: "trop" })).toBe("below");
    expect((await product()).stock).toBe(before + 3);
    expect(await adminAdjustStock({ ...base, type: "ADJUST", delta: -3, reason: "Casse" })).toBe("ok");
    expect((await product()).stock).toBe(before);
  });

  const extraProduct = (suffix: string, stock: number) => {
    const s = `hold-${tag.toLowerCase()}-${suffix}`;
    return db.product.create({ data: { slug: s, name: `Pièce ${suffix} ${tag}`, nameEn: `Piece ${suffix} ${tag}`, description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-hold", creatorSlug: "test-hold", priceCents: 5000, materials: [], sizes: [], images: [], stock, supplierId } });
  };
  const dropExtra = async (slugs: string[]) => {
    await db.checkoutHold.deleteMany({ where: { number: { startsWith: `AM-H${tag}` } } });
    await db.stockMovement.deleteMany({ where: { productSlug: { in: slugs } } });
    await db.product.deleteMany({ where: { slug: { in: slugs } } });
  };
  const line = (p: { slug: string; name: string }) => ({ slug: p.slug, name: p.name, size: null, quantity: 1, unitPriceCents: 5000, supplierId });

  it("course de stock : deux réservations simultanées sur stock 1, un seul gagnant, l'autre reçoit l'erreur nommant la pièce", async () => {
    const { createHold, StockError } = await import("@/lib/checkout-hold");
    const p = await extraProduct("race", 1);
    try {
      const res = await Promise.allSettled([
        createHold(db, { ...payload("r1@test.example"), lines: [line(p)] }, num()),
        createHold(db, { ...payload("r2@test.example"), lines: [line(p)] }, num()),
      ]);
      expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const lost = res.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(lost.reason).toBeInstanceOf(StockError);
      expect(lost.reason).toMatchObject({ item: p.name });
      expect((await db.product.findUniqueOrThrow({ where: { slug: p.slug } })).reserved).toBe(1);
    } finally {
      await dropExtra([p.slug]);
    }
  });

  it("panier de 2 pièces dont une épuisée : l'erreur cite la pièce épuisée, aucune réservation pour l'autre", async () => {
    const { createHold } = await import("@/lib/checkout-hold");
    const ok = await extraProduct("ok", 5);
    const out = await extraProduct("out", 0);
    try {
      const err = await createHold(db, { ...payload("cart@test.example"), lines: [line(ok), line(out)] }, num()).catch((e) => e);
      expect(err).toMatchObject({ item: out.name });
      expect((await db.product.findUniqueOrThrow({ where: { slug: ok.slug } })).reserved).toBe(0);
    } finally {
      await dropExtra([ok.slug, out.slug]);
    }
  });
});