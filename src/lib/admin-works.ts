import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PAGE_SIZE = 25;

export type WorkParams = { f?: string; d?: string; from?: string; to?: string; q?: string; sup?: string; cat?: string; sort?: string; dir?: string; p?: string };

export const TABS = ["pending", "published", "rejected", "all"] as const;
export type Tab = (typeof TABS)[number];

const STATUS: Record<Tab, Prisma.ProductWhereInput> = {
  pending: { status: "SUBMITTED", supplierId: { not: null } },
  published: { status: "PUBLISHED", supplierId: { not: null } },
  rejected: { status: "REJECTED", supplierId: { not: null } },
  all: { status: { in: ["SUBMITTED", "PUBLISHED", "REJECTED"] }, supplierId: { not: null } },
};

export const tabOf = (f?: string): Tab => ((TABS as readonly string[]).includes(f ?? "") ? (f as Tab) : "pending");
export const dateModeOf = (d?: string) => (["today", "7", "30", "custom", "all"].includes(d ?? "") ? (d as string) : "today");
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function dateRange(sp: WorkParams): { gte?: Date; lt?: Date } | null {
  const mode = dateModeOf(sp.d);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (mode === "all") return null;
  if (mode === "today") return { gte: start, lt: new Date(start.getTime() + 86400_000) };
  if (mode === "7" || mode === "30") return { gte: new Date(start.getTime() - (Number(mode) - 1) * 86400_000), lt: new Date(start.getTime() + 86400_000) };
  const parse = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : null);
  const from = parse(sp.from) ?? start;
  const to = parse(sp.to) ?? from;
  return { gte: from, lt: new Date(to.getTime() + 86400_000) };
}

export async function worksWhere(sp: WorkParams, tab: Tab, ignoreDate = false): Promise<Prisma.ProductWhereInput> {
  const range = tab === "pending" || ignoreDate ? null : dateRange(sp);
  const decided: Prisma.ProductWhereInput = range ? { decidedAt: range } : {};
  // « Toutes » = en attente (jamais filtrées par date) + publiées/refusées filtrées par date de décision.
  const base: Prisma.ProductWhereInput =
    tab === "all"
      ? { OR: [{ status: "SUBMITTED", supplierId: { not: null } }, { status: { in: ["PUBLISHED", "REJECTED"] }, supplierId: { not: null }, ...decided }] }
      : { ...STATUS[tab], ...decided };
  const and: Prisma.ProductWhereInput[] = [base];
  const q = (sp.q ?? "").trim().slice(0, 80);
  if (q) {
    const sups = await db.supplier.findMany({ where: { displayName: { contains: q } }, select: { id: true } });
    and.push({ OR: [{ name: { contains: q } }, { nameEn: { contains: q } }, { supplierId: { in: sups.map((s) => s.id) } }] });
  }
  if (sp.sup) and.push({ supplierId: sp.sup });
  if (sp.cat) and.push({ categorySlug: sp.cat });
  return { AND: and };
}

function worksOrder(sp: WorkParams, tab: Tab): Prisma.ProductOrderByWithRelationInput {
  const dir = sp.dir === "asc" ? "asc" : "desc";
  if (sp.sort === "price") return { priceCents: dir };
  if (sp.sort === "date") return { decidedAt: dir };
  return tab === "pending" ? { submittedAt: "asc" } : { decidedAt: "desc" };
}

const WORK_SELECT = {
  slug: true, name: true, nameEn: true, description: true, categorySlug: true, priceCents: true, stock: true, reserved: true,
  images: true, status: true, decidedAt: true, rejectReason: true, createdByAdmin: true, supplierId: true, submittedAt: true,
  edition: true, signatureFileId: true, authorAttestedAt: true, authorAttestedBy: true,
} satisfies Prisma.ProductSelect;

// Le tri par partenaire se fait en mémoire (pas de relation Prisma) ; les autres tris et la pagination côté base.
export async function queryWorks(sp: WorkParams, tab: Tab, opts: { page?: number; all?: boolean }) {
  const where = await worksWhere(sp, tab);
  const total = await db.product.count({ where });
  const byPartner = sp.sort === "partner";
  const dir = sp.dir === "asc" ? 1 : -1;
  const page = opts.page ?? 1;
  const paged = !opts.all && !byPartner;
  const rows = await db.product.findMany({
    where,
    select: WORK_SELECT,
    orderBy: worksOrder(sp, tab),
    ...(paged ? { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE } : { skip: 0, take: 5000 }) as { skip: number; take: number },
  });
  const sups = await db.supplier.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.supplierId ?? ""))] } }, select: { id: true, displayName: true } });
  const nameOf = new Map(sups.map((s) => [s.id, s.displayName]));
  let list = rows.map((r) => ({ ...r, partner: nameOf.get(r.supplierId ?? "") ?? "" }));
  if (byPartner) {
    list.sort((a, b) => a.partner.localeCompare(b.partner) * dir);
    if (!opts.all) list = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }
  return { list, total };
}
