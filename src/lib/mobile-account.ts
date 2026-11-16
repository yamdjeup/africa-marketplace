import { checkAddress, readAddress } from "@/lib/address";
import { db } from "@/lib/db";

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function listFavorites(userId: string) {
  return (await db.favorite.findMany({ where: { userId }, select: { productSlug: true } })).map((r) => r.productSlug);
}

/** Même règle que /api/favorites du site : remplace l'ensemble ; les pièces déjà suivies gardent leur dernier état notifié. */
export async function replaceFavorites(userId: string, slugsIn: unknown) {
  const wanted = Array.isArray(slugsIn) ? [...new Set(slugsIn.filter((s): s is string => typeof s === "string"))].slice(0, 200) : [];
  const existing = new Set(await listFavorites(userId));
  await db.favorite.deleteMany({ where: { userId, productSlug: { notIn: wanted } } });
  const toAdd = wanted.filter((s) => !existing.has(s));
  if (toAdd.length) {
    const products = await db.product.findMany({ where: { slug: { in: toAdd } }, select: { slug: true, priceCents: true, stock: true, reserved: true } });
    for (const p of products) {
      await db.favorite.create({ data: { userId, productSlug: p.slug, lastPriceCents: p.priceCents, lastStock: Math.max(0, p.stock - p.reserved) } });
    }
  }
  return listFavorites(userId);
}

export async function listAddresses(userId: string) {
  return db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

async function makeDefault(userId: string, id: string) {
  await db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.updateMany({ where: { id, userId }, data: { isDefault: true } }),
  ]);
}

/** Création ou mise à jour (id fourni) avec la validation du site (checkAddress). */
export async function saveAddress(userId: string, b: Record<string, unknown>) {
  const v = readAddress((n) => str(b[n]));
  const problem = checkAddress(v);
  if (problem) return { error: problem };
  const data = {
    firstName: v.firstName,
    lastName: v.lastName,
    fullName: `${v.firstName} ${v.lastName}`,
    line1: v.line1,
    houseNumber: v.houseNumber,
    box: v.box || null,
    line2: v.line2 || null,
    postalCode: v.postalCode,
    city: v.city,
    country: v.country,
    phone: v.phone,
  };
  const id = str(b.id, 60);
  let savedId = id;
  if (id) {
    const r = await db.address.updateMany({ where: { id, userId }, data });
    if (!r.count) return { error: "not_found" as const };
  } else {
    const count = await db.address.count({ where: { userId } });
    savedId = (await db.address.create({ data: { ...data, userId, isDefault: count === 0 } })).id;
  }
  if (b.isDefault === true) await makeDefault(userId, savedId);
  return { id: savedId };
}

export async function setDefault(userId: string, id: string) {
  if (!(await db.address.findFirst({ where: { id, userId } }))) return false;
  await makeDefault(userId, id);
  return true;
}

export async function removeAddress(userId: string, id: string) {
  const target = await db.address.findFirst({ where: { id, userId } });
  if (!target) return false;
  await db.address.deleteMany({ where: { id, userId } });
  if (target.isDefault) {
    const first = await db.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (first) await makeDefault(userId, first.id);
  }
  return true;
}
