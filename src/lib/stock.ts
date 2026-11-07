import type { Prisma, PrismaClient } from "@prisma/client";

// Suivi de stock. Stock disponible = stock physique - réservé (par œuvre, ou par variante si l'œuvre en a).
// La réservation est une mise à jour SQL conditionnelle atomique : deux clients ne peuvent pas réserver la dernière pièce.
// Aucune dépendance serveur : utilisable depuis les scripts de vérification.
export type Db = PrismaClient | Prisma.TransactionClient;

export type MovementType = "ENTRY" | "RESERVE" | "RELEASE" | "SALE" | "RETURN" | "ADJUST";
export type Actor = { id?: string | null; label: string };

export const available = (p: { stock: number; reserved: number }) => Math.max(0, p.stock - p.reserved);

type Target = { slug: string; label?: string | null };

async function resolveVariant(db: Db, t: Target) {
  const variants = await db.productVariant.findMany({ where: { productSlug: t.slug } });
  if (variants.length === 0) return { variant: null, hasVariants: false };
  const variant = variants.find((v) => v.label === t.label) ?? null;
  return { variant, hasVariants: true };
}

/** Recalcule le total de l'œuvre à partir de ses variantes. */
export async function syncProductTotals(db: Db, slug: string) {
  const variants = await db.productVariant.findMany({ where: { productSlug: slug } });
  if (variants.length === 0) return;
  await db.product.update({
    where: { slug },
    data: {
      stock: variants.reduce((n, v) => n + v.stock, 0),
      reserved: variants.reduce((n, v) => n + v.reserved, 0),
      sizes: variants.map((v) => v.label),
    },
  });
}

async function log(db: Db, slug: string, variantId: string | null, type: MovementType, quantity: number, reason: string, actor: Actor, orderNumber?: string | null) {
  await db.stockMovement.create({ data: { productSlug: slug, variantId, type, quantity, reason, authorId: actor.id ?? null, authorLabel: actor.label, orderNumber: orderNumber ?? null } });
}

/** Réserve `qty` pièces ; renvoie false si le stock disponible est insuffisant (atomique). */
export async function reserveStock(db: Db, t: Target, qty: number, actor: Actor, orderNumber?: string) {
  const { variant, hasVariants } = await resolveVariant(db, t);
  if (hasVariants) {
    if (!variant) return false;
    const n = await db.$executeRaw`UPDATE "ProductVariant" SET "reserved" = "reserved" + ${qty} WHERE "id" = ${variant.id} AND "stock" - "reserved" >= ${qty}`;
    if (n !== 1) return false;
    await db.$executeRaw`UPDATE "Product" SET "reserved" = "reserved" + ${qty} WHERE "slug" = ${t.slug}`;
  } else {
    const n = await db.$executeRaw`UPDATE "Product" SET "reserved" = "reserved" + ${qty} WHERE "slug" = ${t.slug} AND "status" = 'PUBLISHED' AND "stock" - "reserved" >= ${qty}`;
    if (n !== 1) return false;
  }
  await log(db, t.slug, variant?.id ?? null, "RESERVE", -qty, orderNumber ? `Commande ${orderNumber}` : "Réservation", actor, orderNumber);
  return true;
}

/** Libère une réservation (paiement échoué, refus, expiration 48 h, annulation). */
export async function releaseStock(db: Db, t: Target, qty: number, reason: string, actor: Actor, orderNumber?: string) {
  const { variant, hasVariants } = await resolveVariant(db, t);
  if (hasVariants) {
    if (!variant) return false;
    const n = await db.$executeRaw`UPDATE "ProductVariant" SET "reserved" = "reserved" - ${qty} WHERE "id" = ${variant.id} AND "reserved" >= ${qty}`;
    if (n !== 1) return false;
    await db.$executeRaw`UPDATE "Product" SET "reserved" = "reserved" - ${qty} WHERE "slug" = ${t.slug} AND "reserved" >= ${qty}`;
  } else {
    const n = await db.$executeRaw`UPDATE "Product" SET "reserved" = "reserved" - ${qty} WHERE "slug" = ${t.slug} AND "reserved" >= ${qty}`;
    if (n !== 1) return false;
  }
  await log(db, t.slug, variant?.id ?? null, "RELEASE", qty, reason, actor, orderNumber);
  return true;
}

/** Confirmation définitive (expédition) : la pièce sort du stock physique et de la réservation. */
export async function confirmSale(db: Db, t: Target, qty: number, actor: Actor, orderNumber?: string) {
  const { variant, hasVariants } = await resolveVariant(db, t);
  if (hasVariants) {
    if (!variant) return false;
    const n = await db.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" - ${qty}, "reserved" = "reserved" - ${qty} WHERE "id" = ${variant.id} AND "reserved" >= ${qty} AND "stock" >= ${qty}`;
    if (n !== 1) return false;
    await db.$executeRaw`UPDATE "Product" SET "stock" = "stock" - ${qty}, "reserved" = "reserved" - ${qty} WHERE "slug" = ${t.slug}`;
  } else {
    const n = await db.$executeRaw`UPDATE "Product" SET "stock" = "stock" - ${qty}, "reserved" = "reserved" - ${qty} WHERE "slug" = ${t.slug} AND "reserved" >= ${qty} AND "stock" >= ${qty}`;
    if (n !== 1) return false;
  }
  await log(db, t.slug, variant?.id ?? null, "SALE", -qty, orderNumber ? `Expédiée : ${orderNumber}` : "Vente", actor, orderNumber);
  return true;
}

/** Retour de stock après remboursement / retour accepté. */
export async function returnStock(db: Db, t: Target, qty: number, reason: string, actor: Actor, orderNumber?: string) {
  const { variant, hasVariants } = await resolveVariant(db, t);
  if (hasVariants) {
    if (!variant) return false;
    await db.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" + ${qty} WHERE "id" = ${variant.id}`;
  }
  await db.$executeRaw`UPDATE "Product" SET "stock" = "stock" + ${qty} WHERE "slug" = ${t.slug}`;
  await log(db, t.slug, variant?.id ?? null, "RETURN", qty, reason, actor, orderNumber);
  return true;
}

/** Entrée de stock (delta > 0) ou correction (delta signé) manuelle ; refuse de descendre sous le réservé. */
export async function adjustStock(db: Db, t: Target, delta: number, type: "ENTRY" | "ADJUST", reason: string, actor: Actor) {
  if (!Number.isInteger(delta) || delta === 0) return false;
  const { variant, hasVariants } = await resolveVariant(db, t);
  if (hasVariants) {
    if (!variant) return false;
    const n = await db.$executeRaw`UPDATE "ProductVariant" SET "stock" = "stock" + ${delta} WHERE "id" = ${variant.id} AND "stock" + ${delta} >= "reserved"`;
    if (n !== 1) return false;
    await db.$executeRaw`UPDATE "Product" SET "stock" = "stock" + ${delta} WHERE "slug" = ${t.slug}`;
  } else {
    const n = await db.$executeRaw`UPDATE "Product" SET "stock" = "stock" + ${delta} WHERE "slug" = ${t.slug} AND "stock" + ${delta} >= "reserved"`;
    if (n !== 1) return false;
  }
  await log(db, t.slug, variant?.id ?? null, type, delta, reason, actor);
  return true;
}

export const MOVEMENT_LABELS: Record<MovementType, { fr: string; en: string }> = {
  ENTRY: { fr: "Entrée", en: "Stock in" },
  RESERVE: { fr: "Réservation", en: "Reservation" },
  RELEASE: { fr: "Libération", en: "Release" },
  SALE: { fr: "Vente (sortie physique)", en: "Sale (physical out)" },
  RETURN: { fr: "Retour", en: "Return" },
  ADJUST: { fr: "Correction (+/−)", en: "Correction (+/−)" },
};
