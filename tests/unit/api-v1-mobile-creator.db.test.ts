import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// Routes mobiles /api/v1 : supplier/*, auth/profile, orders/address, creators, shop/categories (base jetable TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile : espace créateur, profil, adresse, annuaire (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let supplierId: string;
  let otherSupplierId: string;
  let subId: string;
  let otherSubId: string;
  let orderNumber: string;
  const tok: Record<string, string> = {};
  const emails: string[] = [];
  const auth = (who: string) => ({ authorization: `Bearer ${tok[who]}`, "content-type": "application/json" });

  const authCall = async (action: string, body?: unknown, headers: Record<string, string> = {}) => {
    const mod = await import("@/app/api/v1/auth/[action]/route");
    const ctx = { params: Promise.resolve({ action }) };
    const url = `https://example.test/api/v1/auth/${action}`;
    return body === undefined ? mod.GET(new Request(url, { headers }), ctx) : mod.POST(new Request(url, { method: "POST", body: JSON.stringify(body), headers }), ctx);
  };
  const mkUser = async (who: string) => {
    const email = `${who}-${tag}@test.invalid`;
    emails.push(email);
    await authCall("register", { name: who, email, password: "motdepasse1" });
    tok[who] = (await (await authCall("login", { email, password: "motdepasse1" })).json()).accessToken;
    return (await db.user.findUniqueOrThrow({ where: { email } })).id;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36);
    const clientId = await mkUser("client");
    const supUser = await mkUser("sup");
    const otherUser = await mkUser("sup2");
    supplierId = (await db.supplier.create({ data: { userId: supUser, displayName: `Atelier ${tag}`, country: "CM", craftType: "couture" } })).id;
    otherSupplierId = (await db.supplier.create({ data: { userId: otherUser, displayName: `Atelier2 ${tag}`, country: "SN", craftType: "art" } })).id;
    orderNumber = `AM-S${tag.toUpperCase()}`;
    const order = await db.order.create({ data: { userId: clientId, number: orderNumber, locale: "fr", email: `client-${tag}@test.invalid`, fullName: "Client Test", address: "1 rue Test", postalCode: "75001", city: "Paris", country: "FR", totalCents: 5000 } });
    subId = (await db.subOrder.create({ data: { orderId: order.id, supplierId, number: `${orderNumber}-1`, status: "PENDING", subtotalCents: 5000, acceptBy: new Date(Date.now() + 86_400_000) } })).id;
    otherSubId = (await db.subOrder.create({ data: { orderId: order.id, supplierId: otherSupplierId, number: `${orderNumber}-2`, status: "PENDING", subtotalCents: 0, acceptBy: new Date(Date.now() + 86_400_000) } })).id;
    await db.product.create({ data: { slug: `p-${tag}`, supplierId: otherSupplierId, name: "Œuvre", description: "d", priceCents: 1000, category: "art", images: [], stock: 1 } as never }).catch(() => undefined);
  });
  afterAll(async () => {
    if (!db) return;
    await db.product.deleteMany({ where: { slug: `p-${tag}` } });
    await db.subOrder.deleteMany({ where: { number: { startsWith: orderNumber } } });
    await db.order.deleteMany({ where: { number: orderNumber } });
    await db.supplier.deleteMany({ where: { id: { in: [supplierId, otherSupplierId] } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
  });

  it("supplier/* : 403 pour un client, 404 pour la commande/œuvre d'un autre créateur", async () => {
    const sOrders = await import("@/app/api/v1/supplier/orders/route");
    const sOrder = await import("@/app/api/v1/supplier/orders/[id]/route");
    const sProduct = await import("@/app/api/v1/supplier/products/[slug]/route");
    const sDash = await import("@/app/api/v1/supplier/dashboard/route");
    const get = (u: string, who: string) => new Request(`https://example.test${u}`, { headers: auth(who) });
    expect((await sOrders.GET(get("/api/v1/supplier/orders", "client"))).status).toBe(403);
    expect((await sDash.GET(get("/api/v1/supplier/dashboard", "client"))).status).toBe(403);
    expect((await sOrder.GET(get(`/x/${subId}`, "client"), { params: Promise.resolve({ id: subId }) })).status).toBe(403);
    expect((await sOrder.GET(get(`/x/${subId}`, "sup"), { params: Promise.resolve({ id: subId }) })).status).toBe(200);
    expect((await sOrder.GET(get(`/x/${otherSubId}`, "sup"), { params: Promise.resolve({ id: otherSubId }) })).status).toBe(404);
    const post = new Request("https://example.test/x", { method: "POST", headers: auth("sup"), body: "{}" });
    expect((await sProduct.POST(post, { params: Promise.resolve({ slug: `p-${tag}` }) })).status).toBe(404);
    const asClient = new Request("https://example.test/x", { method: "POST", headers: auth("client"), body: "{}" });
    expect((await sProduct.POST(asClient, { params: Promise.resolve({ slug: `p-${tag}` }) })).status).toBe(403);
  });

  it("auth/profile : lecture, nom requis, mot de passe (8 car., actuel vérifié)", async () => {
    const read = await authCall("profile", undefined, auth("client"));
    expect(read.status).toBe(200);
    expect((await read.json()).social).toBe(false);
    expect((await authCall("profile", undefined)).status).toBe(401);
    expect((await authCall("profile", { name: " " }, auth("client"))).status).toBe(400);
    expect((await authCall("profile", { name: "N", newPassword: "court", currentPassword: "motdepasse1" }, auth("client"))).status).toBe(400);
    expect((await authCall("profile", { name: "N", newPassword: "nouveaumdp1", currentPassword: "faux" }, auth("client"))).status).toBe(400);
    expect((await authCall("profile", { name: "Nouveau", newPassword: "nouveaumdp1", currentPassword: "motdepasse1" }, auth("client"))).status).toBe(200);
    const login = await authCall("login", { email: `client-${tag}@test.invalid`, password: "nouveaumdp1" });
    expect(login.status).toBe(200);
  });

  it("orders/address : propriétaire seulement, adresse validée", async () => {
    const mod = await import("@/app/api/v1/orders/address/route");
    const addr = { number: orderNumber, firstName: "Awa", lastName: "Diop", line1: "Rue Test", houseNumber: "5", postalCode: "75002", city: "Paris", country: "FR", phone: "+33612345678" };
    const call = (who: string | null, body: unknown) => mod.POST(new Request("https://example.test/x", { method: "POST", headers: who ? auth(who) : {}, body: JSON.stringify(body) }));
    expect((await call(null, addr)).status).toBe(401);
    expect((await call("sup", addr)).status).toBe(404);
    expect((await call("client", { ...addr, postalCode: "" })).status).toBe(400);
    expect([200, 409]).toContain((await call("client", addr)).status);
  });

  it("creators et shop/categories : réponses JSON publiques", async () => {
    const creators = await import("@/app/api/v1/creators/route");
    const r = await creators.GET(new Request("https://example.test/api/v1/creators?tab=art&locale=en"));
    expect(r.status).toBe(200);
    expect(Array.isArray((await r.json()).items)).toBe(true);
    const cats = await import("@/app/api/v1/shop/categories/route");
    expect((await cats.GET(new Request("https://example.test/api/v1/shop/categories?locale=fr"))).status).toBe(200);
  });
});
