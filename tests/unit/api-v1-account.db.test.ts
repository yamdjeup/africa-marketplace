import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

// Favoris et adresses mobiles /api/v1 (base jetable TEST_DATABASE_URL, jamais la production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile favoris + adresses (base de test)", () => {
  let db: PrismaClient;
  let email: string;
  let auth: Record<string, string>;
  let supplierId: string;
  let slug: string;
  const url = (p: string) => `https://example.test/api/v1/${p}`;
  const json = (method: string, body?: unknown) => ({ method, headers: auth, body: body === undefined ? undefined : JSON.stringify(body) });
  const addr = { firstName: "Awa", lastName: "Diop", country: "France", line1: "Rue de la Paix", houseNumber: "12", postalCode: "75002", city: "Paris", phone: "+33612345678" };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    const tag = Date.now().toString(36);
    email = `mobacc-${tag}@test.invalid`;
    slug = `mobacc-${tag}`;
    const { registerWithPassword } = await import("@/lib/mobile-auth");
    const r = await registerWithPassword("Awa", email, "motdepasse1");
    if ("error" in r && r.error) throw new Error(r.error);
    auth = { authorization: `Bearer ${(r as { accessToken: string }).accessToken}` };
    supplierId = (await db.supplier.create({ data: { displayName: `Boutique ${tag}`, country: "CM", craftType: "couture" } })).id;
    await db.category.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "Test", nameEn: "Test" } });
    await db.creator.upsert({ where: { slug: "test-mob" }, update: {}, create: { slug: "test-mob", name: "Créatrice", specialty: "t", specialtyEn: "t", bio: "t", bioEn: "t", image: "/images/x.png", sourceUrl: "x" } });
    await db.product.create({ data: { slug, name: "P", nameEn: "P", description: "d", descriptionEn: "d", story: "s", storyEn: "s", categorySlug: "test-mob", creatorSlug: "test-mob", priceCents: 1000, materials: [], sizes: [], images: [], stock: 2, supplierId, status: "PUBLISHED" } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.user.deleteMany({ where: { email } });
    await db.product.deleteMany({ where: { slug } });
    await db.supplier.delete({ where: { id: supplierId } }).catch(() => undefined);
  });

  it("favoris : 401 sans jeton, remplacement, relecture", async () => {
    const fav = await import("@/app/api/v1/favorites/route");
    expect((await fav.GET(new Request(url("favorites")))).status).toBe(401);
    const put = await fav.PUT(new Request(url("favorites"), json("PUT", { slugs: [slug, "inconnu"] })));
    expect((await put.json()).slugs).toEqual([slug]);
    expect((await (await fav.GET(new Request(url("favorites"), { headers: auth }))).json()).slugs).toEqual([slug]);
    expect((await (await fav.PUT(new Request(url("favorites"), json("PUT", { slugs: [] })))).json()).slugs).toEqual([]);
  });

  it("adresses : validation, défaut, mise à jour, suppression", async () => {
    const a = await import("@/app/api/v1/addresses/route");
    expect((await a.GET(new Request(url("addresses")))).status).toBe(401);
    expect((await a.POST(new Request(url("addresses"), json("POST", { ...addr, line1: "" })))).status).toBe(400);
    const first = await (await a.POST(new Request(url("addresses"), json("POST", addr)))).json();
    expect(first.items[0].isDefault).toBe(true);
    const second = await (await a.POST(new Request(url("addresses"), json("POST", { ...addr, city: "Lyon", postalCode: "69001" })))).json();
    expect(second.items).toHaveLength(2);
    const patched = await (await a.PATCH(new Request(url("addresses"), json("PATCH", { id: second.id })))).json();
    expect(patched.items[0].id).toBe(second.id);
    const upd = await a.POST(new Request(url("addresses"), json("POST", { ...addr, id: first.id, city: "Nice", postalCode: "06000" })));
    expect(upd.status).toBe(201);
    const del = await (await a.DELETE(new Request(`${url("addresses")}?id=${second.id}`, { method: "DELETE", headers: auth }))).json();
    expect(del.items).toHaveLength(1);
    expect(del.items[0].isDefault).toBe(true);
    expect(del.items[0].city).toBe("Nice");
    expect((await a.DELETE(new Request(`${url("addresses")}?id=zzz`, { method: "DELETE", headers: auth }))).status).toBe(404);
  });
});
