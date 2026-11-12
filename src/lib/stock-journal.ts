import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type JournalParams = { q?: string; t?: string; from?: string; to?: string; who?: string; r?: string; dir?: string; sup?: string; mp?: string };
export const JOURNAL_KEYS = ["q", "t", "from", "to", "who", "r", "dir", "sup"] as const;
export const JOURNAL_TYPES = ["ENTRY", "RESERVE", "RELEASE", "SALE", "RETURN", "ADJUST"] as const;

const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** Construit le filtre Prisma ; `scope` limite aux créations du partenaire. */
export async function journalWhere(sp: JournalParams, scope?: string[]): Promise<Prisma.StockMovementWhereInput> {
  const and: Prisma.StockMovementWhereInput[] = [];
  if (scope) and.push({ productSlug: { in: scope } });
  if (sp.sup) {
    const slugs = (await db.product.findMany({ where: { supplierId: sp.sup }, select: { slug: true } })).map((x) => x.slug);
    and.push({ productSlug: { in: slugs } });
  }
  const q = sp.q?.trim();
  if (q) {
    const hit = await db.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { nameEn: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }, select: { slug: true }, take: 500 });
    and.push({ productSlug: { in: hit.map((h) => h.slug) } });
  }
  if (sp.t && (JOURNAL_TYPES as readonly string[]).includes(sp.t)) and.push({ type: sp.t });
  const from = day(sp.from);
  const to = day(sp.to);
  if (from) and.push({ createdAt: { gte: new Date(`${from}T00:00:00+01:00`) } });
  if (to) and.push({ createdAt: { lte: new Date(`${to}T23:59:59+01:00`) } });
  if (sp.who?.trim()) and.push({ authorLabel: { contains: sp.who.trim(), mode: "insensitive" } });
  if (sp.r?.trim()) and.push({ reason: { contains: sp.r.trim(), mode: "insensitive" } });
  return and.length ? { AND: and } : {};
}

export const journalOrder = (sp: JournalParams): Prisma.StockMovementOrderByWithRelationInput => ({ createdAt: sp.dir === "asc" ? "asc" : "desc" });
