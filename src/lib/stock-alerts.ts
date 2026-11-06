import "server-only";
import { db } from "@/lib/db";
import { emailLowStock } from "@/lib/supplier-email";

/** Alerte stock bas : e-mail au partenaire quand le disponible passe sous son seuil (avant -> après). */
export async function notifyLowStock(before: Map<string, number>) {
  for (const [slug, prev] of before) {
    const p = await db.product.findUnique({ where: { slug }, select: { slug: true, name: true, stock: true, reserved: true, lowStockThreshold: true, supplierId: true } });
    if (!p?.supplierId) continue;
    const avail = Math.max(0, p.stock - p.reserved);
    if (!(prev > p.lowStockThreshold && avail <= p.lowStockThreshold)) continue;
    const s = await db.supplier.findUnique({ where: { id: p.supplierId }, include: { user: { select: { email: true } } } });
    if (!s?.user?.email) continue;
    await emailLowStock({ email: s.user.email, name: s.displayName, locale: "fr" }, p.name, avail, p.slug);
  }
}
