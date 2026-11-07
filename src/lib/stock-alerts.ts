import "server-only";
import { db } from "@/lib/db";
import { emailLowStock } from "@/lib/supplier-email";

type Avail = { stock: number; reserved: number; variants: { stock: number; reserved: number }[] };
// Disponible réel : somme des variantes quand il y en a, sinon stock du produit.
const availOf = (p: Avail) => Math.max(0, p.variants.length > 0 ? p.variants.reduce((n, v) => n + v.stock - v.reserved, 0) : p.stock - p.reserved);

/** Photographie du disponible (avant l'opération) pour les slugs donnés. */
export async function snapshotAvail(slugs: string[]): Promise<Map<string, number>> {
  const rows = await db.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, stock: true, reserved: true, variants: { select: { stock: true, reserved: true } } } });
  return new Map(rows.map((p) => [p.slug, availOf(p)]));
}

/** Alerte stock bas : e-mail au partenaire quand le disponible passe sous son seuil (avant -> après). */
export async function notifyLowStock(before: Map<string, number>) {
  for (const [slug, prev] of before) {
    const p = await db.product.findUnique({ where: { slug }, select: { slug: true, name: true, stock: true, reserved: true, lowStockThreshold: true, supplierId: true, variants: { select: { stock: true, reserved: true } } } });
    if (!p?.supplierId) continue;
    const avail = availOf(p);
    if (!(prev > p.lowStockThreshold && avail <= p.lowStockThreshold)) continue;
    const s = await db.supplier.findUnique({ where: { id: p.supplierId }, include: { user: { select: { email: true } } } });
    if (!s?.user?.email) continue;
    await emailLowStock({ email: s.user.email, name: s.displayName, locale: "fr" }, p.name, avail, p.slug);
  }
}
