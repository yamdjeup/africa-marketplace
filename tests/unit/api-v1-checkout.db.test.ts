import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: () => undefined, revalidatePath: () => undefined }));
vi.mock("next/server", async () => ({ ...(await import("next/server.js")), after: () => undefined }));
vi.mock("@/lib/order-email", () => ({ sendOrderEmail: async () => undefined, sendStockRefundEmail: async () => undefined }));

// Paiement et commandes mobiles /api/v1/checkout + /orders (base jetable, Stripe simulÃ© par un fetch local).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile paiement + commandes (base de test)", () => {
  let db: PrismaClient;
  let email: string;
  let auth: Record<string, string>;
  let supplierId: string;
  let slug: string;
  let addressId: string;
  const url = (p: string) => `https://example.test/api/v1/${p}`;
  const post = (body: unknown, h = auth) => ({ method: "POST", headers: h, body: JSON.stringify(body) });
  const ctx = (action: string) => ({ params: Promise.resolve({ action }) });

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    process.env.STRIPE_SECRET_KEY = "sk_test_local";
    ({ db } = await import("@/lib/db"));
    const tag = Date.now().toString(36);
    email = `mobpay-${tag}@test.invalid`;
    slug = `mobpay-${tag}`;
    const { registerWithPassword } = await import("@/lib/mobile-auth");
    const r = await registerWithPassword("Awa", email, "motdepasse1");
    if ("error" in r && r.error) throw new Error(r.error);
    auth = { authorization: `Bearer ${(r as { accessToken: string }).accessToken}` };
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    addressId = (await db.address.create({ data: { userId: user.id, fullName: "Awa Diop", firstName: "Awa", lastName: "Diop", country: "France", line1: "Rue de la Paix", houseNumber: "12", postalCode: "75002", city: "Paris", phone: "+33612345678", isDefault: true } })).id;
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "CrÃ©atrice", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/images/x.png", sourceUrl: "x" } });
    await db.product.create({ data: { slug, name: "P", nameEn: "P", description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-mob", creatorSlug: "test-mob", priceCents: 1000, materials: [], sizes: [], images: [], stock: 2, supplierId, status: "PUBLISHED" } });
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (!db) return;
    await db.order.deleteMany({ where: { email } });
    await db.checkoutHold.deleteMany({ where: { buyerKey: { contains: email } } });
    await db.user.deleteMany({ where: { email } });
    await db.product.deleteMany({ where: { slug } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
  });

  it("401 sans jeton ; stock insuffisant refusÃ©", async () => {
    const co = await import("@/app/api/v1/checkout/[action]/route");
    expect((await co.POST(new Request(url("checkout/create"), { method: "POST", body: "{}" }), ctx("create"))).status).toBe(400);
    const r = await co.POST(new Request(url("checkout/create"), post({ addressId, cart: [{ slug, size: null, quantity: 5 }] })), ctx("create"));
    expect(r.status).toBe(409);
  });

  it("crÃ©ation du paiement, confirmation â†’ commande, liste des commandes", async () => {
    let created: { amount?: string } = {};
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (String(u).endsWith("/payment_intents")) {
        created = { amount: new URLSearchParams(String(init?.body)).get("amount") ?? "" };
        const meta = new URLSearchParams(String(init?.body)).get("metadata[orderNumber]");
        (globalThis as { __n?: string }).__n = meta ?? "";
        return new Response(JSON.stringify({ id: "pi_local", client_secret: "pi_local_secret" }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "pi_local", status: "succeeded", amount_received: 2000, metadata: { orderNumber: (globalThis as { __n?: string }).__n } }), { status: 200 });
    });
    const co = await import("@/app/api/v1/checkout/[action]/route");
    const c = await (await co.POST(new Request(url("checkout/create"), post({ addressId, cart: [{ slug, size: null, quantity: 2 }] })), ctx("create"))).json();
    expect(created.amount).toBe("2000");
    expect(c.clientSecret).toBe("pi_local_secret");
    const ok = await (await co.POST(new Request(url("checkout/confirm"), post({ number: c.number })), ctx("confirm"))).json();
    expect(ok.status).toBe("paid");
    const orders = await import("@/app/api/v1/orders/route");
    expect((await orders.GET(new Request(url("orders")))).status).toBe(401);
    const list = await (await orders.GET(new Request(url("orders"), { headers: auth }))).json();
    expect(list.orders[0].number).toBe(c.number);
    expect(list.orders[0].totalCents).toBe(2000);
    const again = await (await co.POST(new Request(url("checkout/confirm"), post({ number: c.number })), ctx("confirm"))).json();
    expect(again.status).toBe("paid");
  });

  it("invité : adresse saisie + e-mail, jeton invité requis pour confirmer", async () => {
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (String(u).endsWith("/payment_intents")) {
        (globalThis as { __n?: string }).__n = new URLSearchParams(String(init?.body)).get("metadata[orderNumber]") ?? "";
        return new Response(JSON.stringify({ id: "pi_guest", client_secret: "pi_guest_secret" }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "pi_guest", status: "succeeded", amount_received: 1000, metadata: { orderNumber: (globalThis as { __n?: string }).__n } }), { status: 200 });
    });
    const guestSlug = `${slug}-g`;
    await db.product.create({ data: { slug: guestSlug, name: "G", nameEn: "G", description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-mob", creatorSlug: "test-mob", priceCents: 1000, materials: [], sizes: [], images: [], stock: 3, supplierId, status: "PUBLISHED" } });
    const co = await import("@/app/api/v1/checkout/[action]/route");
    const guestEmail = `guest-${email}`;
    const address = { firstName: "Awa", lastName: "Diop", country: "France", line1: "Rue de la Paix", houseNumber: "12", postalCode: "75002", city: "Paris", phone: "+33612345678" };
    const cart = [{ slug: guestSlug, size: null, quantity: 1 }];
    const H = { "content-type": "application/json" };
    const bad = await co.POST(new Request(url("checkout/create"), post({ address, email: "pas-un-email", cart }, H)), ctx("create"));
    expect(bad.status).toBe(400);
    const badPostal = await co.POST(new Request(url("checkout/create"), post({ address: { ...address, postalCode: "12" }, email: guestEmail, cart }, H)), ctx("create"));
    expect(((await badPostal.json()) as { error: string }).error).toBe("postal");
    const c = await (await co.POST(new Request(url("checkout/create"), post({ address, email: guestEmail, cart }, H)), ctx("create"))).json();
    expect(c.clientSecret).toBe("pi_guest_secret");
    expect(typeof c.guestToken).toBe("string");
    expect((await (await co.POST(new Request(url("checkout/confirm"), post({ number: c.number, guestToken: "faux" }, H)), ctx("confirm"))).json()).status).toBe("unknown");
    expect((await (await co.POST(new Request(url("checkout/confirm"), post({ number: c.number, guestToken: c.guestToken }, H)), ctx("confirm"))).json()).status).toBe("paid");
    const order = await db.order.findUniqueOrThrow({ where: { number: c.number } });
    expect(order.userId).toBeNull();
    expect(order.email).toBe(guestEmail);
    await db.order.deleteMany({ where: { email: guestEmail } });
    await db.product.deleteMany({ where: { slug: guestSlug } });
  });

  it("connecté : save=true enregistre l'adresse saisie dans le carnet", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ id: "pi_save", client_secret: "pi_save_secret" }), { status: 200 }));
    const saveSlug = `${slug}-s`;
    await db.product.create({ data: { slug: saveSlug, name: "S", nameEn: "S", description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-mob", creatorSlug: "test-mob", priceCents: 1000, materials: [], sizes: [], images: [], stock: 3, supplierId, status: "PUBLISHED" } });
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const before = await db.address.count({ where: { userId: user.id } });
    const co = await import("@/app/api/v1/checkout/[action]/route");
    const address = { firstName: "Awa", lastName: "Diop", country: "France", line1: "Rue Neuve", houseNumber: "3", postalCode: "69001", city: "Lyon", phone: "+33612345678" };
    const r = await co.POST(new Request(url("checkout/create"), post({ address, save: true, cart: [{ slug: saveSlug, size: null, quantity: 1 }] })), ctx("create"));
    expect(r.status).toBe(200);
    expect(await db.address.count({ where: { userId: user.id } })).toBe(before + 1);
    await db.checkoutHold.deleteMany({ where: { buyerKey: { contains: email } } });
    await db.product.deleteMany({ where: { slug: saveSlug } });
  });
});