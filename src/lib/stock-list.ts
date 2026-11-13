import { db } from "@/lib/db";
import { dateModeOf, dateRange } from "@/lib/admin-works";

export const STOCK_LIST_PAGE = 50;
export const STOCK_LIST_KEYS = ["sd", "sfrom", "sto", "sq", "ssup", "scat", "sst", "svar", "ssort", "sdir"] as const;
export const STOCK_STATUSES = ["all", "avail", "low", "out", "held"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];
export type StockListParams = Partial<Record<(typeof STOCK_LIST_KEYS)[number] | "sp", string>>;

const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Liste « Stock par création » filtrée. `supplierIds` borne toujours le périmètre (partenaire ou admin). La période porte sur la date du dernier mouvement de stock. */
export async function loadStockList(sp: StockListParams, supplierIds: string[], fr: boolean, now = new Date()) {
  const page = Math.max(1, Math.trunc(Number(sp.sp)) || 1);
  const scope = sp.ssup && supplierIds.includes(sp.ssup) ? [sp.ssup] : supplierIds;
  const products = await db.product.findMany({
    where: { supplierId: { in: scope }, ...(sp.scat ? { categorySlug: sp.scat } : {}) },
    select: { slug: true, name: true, nameEn: true, stock: true, reserved: true, supplierId: true, categorySlug: true, lowStockThreshold: true },
  });
  const cats = (await db.product.findMany({ where: { supplierId: { in: scope } }, distinct: ["categorySlug"], select: { categorySlug: true } })).map((c) => c.categorySlug).sort();
  const q = fold((sp.sq ?? "").trim().slice(0, 80));
  let list = products.filter((p) => !q || fold(`${p.name} ${p.nameEn}`).includes(q));
  const slugs = list.map((p) => p.slug);

  const mode = sp.sd ? dateModeOf(sp.sd) : sp.sfrom || sp.sto ? "custom" : "all";
  const range = dateRange({ d: mode, from: day(sp.sfrom), to: day(sp.sto) });
  const moves = await db.stockMovement.groupBy({ by: ["productSlug"], where: { productSlug: { in: slugs }, ...(range ? { createdAt: range } : {}) }, _max: { createdAt: true } });
  const lastOf = new Map(moves.map((m) => [m.productSlug, m._max.createdAt]));
  if (range) list = list.filter((p) => lastOf.has(p.slug));

  const variants = await db.productVariant.findMany({ where: { productSlug: { in: list.map((p) => p.slug) } }, select: { productSlug: true, label: true, stock: true, reserved: true } });
  const holds = await db.checkoutHold.findMany({ where: { status: "HELD", expiresAt: { gt: now } }, select: { expiresAt: true, payload: true } });
  const holdsBy = new Map<string, string[]>();
  for (const h of holds) {
    const pl = h.payload as { email?: string; lines?: { slug: string; quantity: number }[] } | null;
    const at = h.expiresAt.toLocaleTimeString(fr ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    for (const l of pl?.lines ?? []) holdsBy.set(l.slug, [...(holdsBy.get(l.slug) ?? []), `${pl?.email ?? "?"} x${l.quantity} -> ${at}`]);
  }

  const vq = fold((sp.svar ?? "").trim());
  let rows = list.map((p) => {
    const vs = variants.filter((v) => v.productSlug === p.slug);
    const total = vs.length ? vs.reduce((n, v) => n + v.stock, 0) : p.stock;
    const reserved = vs.length ? vs.reduce((n, v) => n + v.reserved, 0) : p.reserved;
    const avail = total - reserved;
    const holdsList = holdsBy.get(p.slug) ?? [];
    return { ...p, variants: vs, total, reserved, avail, holds: holdsList, lastMove: lastOf.get(p.slug) ?? null, low: avail > 0 && avail <= p.lowStockThreshold, out: avail <= 0, held: reserved > 0 || holdsList.length > 0 };
  });
  if (vq) rows = rows.filter((r) => r.variants.some((v) => fold(v.label).includes(vq)));

  const is = (r: (typeof rows)[number], s: StockStatus) => s === "all" || (s === "avail" ? r.avail > 0 : s === "low" ? r.low : s === "out" ? r.out : r.held);
  const counts = Object.fromEntries(STOCK_STATUSES.map((s) => [s, rows.filter((r) => is(r, s)).length])) as Record<StockStatus, number>;
  const st = (STOCK_STATUSES as readonly string[]).includes(sp.sst ?? "") ? (sp.sst as StockStatus) : "all";
  rows = rows.filter((r) => is(r, st));

  const dir = sp.sdir === "desc" ? -1 : 1;
  const t = (d: Date | null) => d?.getTime() ?? 0;
  if (sp.ssort === "avail") rows.sort((a, b) => (a.avail - b.avail) * dir);
  else if (sp.ssort === "reserved") rows.sort((a, b) => (a.reserved - b.reserved) * dir);
  else if (sp.ssort === "last") rows.sort((a, b) => (t(a.lastMove) - t(b.lastMove)) * dir);
  else rows.sort((a, b) => (fr ? a.name : a.nameEn).localeCompare(fr ? b.name : b.nameEn) * dir);

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / STOCK_LIST_PAGE));
  const cur = Math.min(page, pages);
  return { rows: rows.slice((cur - 1) * STOCK_LIST_PAGE, cur * STOCK_LIST_PAGE), total, pages, page: cur, counts, status: st, mode, cats };
}
