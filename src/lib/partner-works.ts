import { db } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/admin-works";

export { PAGE_SIZE };
export const PTABS = ["all", "SUBMITTED", "PUBLISHED", "REJECTED", "DRAFT", "low"] as const;
export type PTab = (typeof PTABS)[number];
export type PWorkParams = { f?: string; q?: string; cat?: string; st?: string; sort?: string; dir?: string; p?: string };

export const ptabOf = (f?: string): PTab => ((PTABS as readonly string[]).includes(f ?? "") ? (f as PTab) : "all");

type Row = Awaited<ReturnType<typeof loadRows>>[number];

const loadRows = (supplierId: string) => db.product.findMany({ where: { supplierId }, orderBy: { name: "asc" } });

const isLow = (p: Row) => p.status === "PUBLISHED" && p.stock - p.reserved <= p.lowStockThreshold;

// Toujours limité au partenaire (supplierId) ; filtres, tri et pagination en mémoire (volume par partenaire modeste).
export async function queryPartnerWorks(supplierId: string, sp: PWorkParams, opts: { page?: number; all?: boolean; locale?: string }) {
  const rows = await loadRows(supplierId);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const matches = (p: Row, tab: PTab) =>
    (tab === "all" || (tab === "low" ? isLow(p) : p.status === tab)) &&
    (!sp.cat || p.categorySlug === sp.cat) &&
    (!sp.st || p.status === sp.st) &&
    (!q || p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q));
  const counts = Object.fromEntries(PTABS.map((t) => [t, rows.filter((p) => matches(p, t)).length])) as Record<PTab, number>;
  const tab = ptabOf(sp.f);
  const dir = sp.dir === "asc" ? 1 : -1;
  const t = (d: Date | null) => d?.getTime() ?? 0;
  const list = rows.filter((p) => matches(p, tab));
  if (sp.sort === "price") list.sort((a, b) => (a.priceCents - b.priceCents) * dir);
  else if (sp.sort === "stock") list.sort((a, b) => (a.stock - a.reserved - (b.stock - b.reserved)) * dir);
  else if (sp.sort === "date") list.sort((a, b) => (t(a.decidedAt) - t(b.decidedAt)) * dir);
  else if (sp.sort === "wait") list.sort((a, b) => (t(a.submittedAt ?? a.createdAt) - t(b.submittedAt ?? b.createdAt)) * dir);
  else if (sp.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name) * dir);
  const page = opts.page ?? 1;
  return { list: opts.all ? list : list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: list.length, counts, isLow };
}
