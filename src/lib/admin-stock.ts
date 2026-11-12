import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { journalOrder, journalWhere, type JournalParams } from "@/lib/stock-journal";

export const STOCK_PAGE = 50;
export type AdminStockParams = JournalParams & { p?: string; sp?: string };

/** Données de la page admin « Stocks » (stock par création, réservations actives, journal filtré). */
export async function loadAdminStock(sp: AdminStockParams, fr: boolean) {
  const PAGE = STOCK_PAGE;
  const page = Math.max(1, Math.trunc(Number(sp.p)) || 1);
  const sups = await db.supplier.findMany({ where: { isDemo: false }, orderBy: { displayName: "asc" }, select: { id: true, displayName: true } });
  const where = await journalWhere(sp);
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: journalOrder(sp), skip: (page - 1) * PAGE, take: PAGE }),
    db.stockMovement.count({ where }),
  ]);
  const slugs = [...new Set(rows.map((m) => m.productSlug))];
  const prods = await db.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true, nameEn: true, supplierId: true } });
  const prodOf = new Map(prods.map((x) => [x.slug, x]));
  const vids = [...new Set(rows.map((m) => m.variantId).filter((x): x is string => !!x))];
  const vlabel = new Map((await db.productVariant.findMany({ where: { id: { in: vids } }, select: { id: true, label: true } })).map((v) => [v.id, v.label]));
  const sp2 = Math.max(1, Math.trunc(Number(sp.sp)) || 1);
  const stockWhere: Prisma.ProductWhereInput = { supplierId: sp.sup ? sp.sup : { in: sups.map((s) => s.id) } };
  const [stockRows, stockTotal] = await Promise.all([
    db.product.findMany({ where: stockWhere, orderBy: { name: "asc" }, skip: (sp2 - 1) * PAGE, take: PAGE, select: { slug: true, name: true, nameEn: true, stock: true, reserved: true, supplierId: true } }),
    db.product.count({ where: stockWhere }),
  ]);
  const varRows = await db.productVariant.findMany({ where: { productSlug: { in: stockRows.map((s) => s.slug) } }, select: { productSlug: true, label: true, stock: true, reserved: true } });
  const supName = new Map(sups.map((s) => [s.id, s.displayName]));
  const holds = await db.checkoutHold.findMany({ where: { status: "HELD", expiresAt: { gt: new Date() } }, select: { expiresAt: true, payload: true } });
  const holdsBy = new Map<string, string[]>();
  for (const h of holds) {
    const pl = h.payload as { email?: string; lines?: { slug: string; quantity: number }[] } | null;
    for (const l of pl?.lines ?? []) holdsBy.set(l.slug, [...(holdsBy.get(l.slug) ?? []), `${pl?.email ?? "?"} x${l.quantity} -> ${h.expiresAt.toLocaleTimeString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`]);
  }
  const spages = Math.max(1, Math.ceil(stockTotal / PAGE));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return { sups, rows, total, prodOf, vlabel, sp2, stockRows, stockTotal, varRows, supName, holdsBy, spages, pages };
}
