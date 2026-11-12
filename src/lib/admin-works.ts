import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PAGE_SIZE = 25;
// Seuils de priorité des œuvres en attente (heures).
export const WAIT_WARN_H = 24;
export const WAIT_ALERT_H = 72;
export const waitHours = (since: Date | null, now = Date.now()) => (since ? Math.max(0, (now - since.getTime()) / 3600_000) : 0);
export const waitLabel = (h: number) => (h < 1 ? "moins d'1 h" : h < 48 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} j`);

export type WorkParams = { f?: string; d?: string; from?: string; to?: string; q?: string; sup?: string; cat?: string; st?: string; sort?: string; dir?: string; p?: string };

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
const TZ = "Europe/Paris";
// Jour calendaire (aaaa-mm-jj) d'un instant, en heure de Paris.
export const isoDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (ymd: string, n: number) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10) + n)).toISOString().slice(0, 10);
const validDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);

// Minuit (heure de Paris) d'un jour donné, en instant UTC.
function parisMidnight(ymd: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

// Valeurs Du/Au reflétant la période choisie ("" = champs vides pour « Toutes les dates »).
export function rangeFields(sp: WorkParams, now = new Date()): { from: string; to: string; swapped: boolean } {
  const mode = dateModeOf(sp.d);
  const today = isoDay(now);
  if (mode === "all") return { from: "", to: "", swapped: false };
  if (mode === "today") return { from: today, to: today, swapped: false };
  if (mode === "7" || mode === "30") return { from: addDays(today, -(Number(mode) - 1)), to: today, swapped: false };
  // Plage personnalisée : une borne seule reste ouverte de l'autre côté (pas de remplissage automatique).
  const from = validDay(sp.from) ?? "";
  const to = validDay(sp.to) ?? "";
  if (!from && !to) return { from: today, to: today, swapped: false };
  return from && to && from > to ? { from: to, to: from, swapped: true } : { from, to, swapped: false };
}

export function dateRange(sp: WorkParams): { gte?: Date; lt?: Date } | null {
  if (dateModeOf(sp.d) === "all") return null;
  const { from, to } = rangeFields(sp);
  return { ...(from ? { gte: parisMidnight(from) } : {}), ...(to ? { lt: parisMidnight(addDays(to, 1)) } : {}) };
}

export const CSV_STATUS: Record<string, string> = { DRAFT: "Brouillon", SUBMITTED: "En modération", PUBLISHED: "Publiée", REJECTED: "Refusée" };
export const parisFmt = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
export async function categoryLabels(): Promise<Map<string, string>> {
  const cats = await db.category.findMany({ select: { slug: true, name: true } });
  return new Map(cats.map((c) => [c.slug, c.name]));
}
// Normalisation pour les recherches insensibles à la casse et aux accents.
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export async function worksWhere(sp: WorkParams, tab: Tab, ignoreDate = false): Promise<Prisma.ProductWhereInput> {
  const range = tab === "pending" || ignoreDate ? null : dateRange(sp);
  const decided: Prisma.ProductWhereInput = range ? { decidedAt: range } : {};
  // « Toutes » = en attente (jamais filtrées par date) + publiées/refusées filtrées par date de décision.
  const base: Prisma.ProductWhereInput =
    tab === "all"
      ? { OR: [{ status: "SUBMITTED", supplierId: { not: null } }, { status: { in: ["PUBLISHED", "REJECTED"] }, supplierId: { not: null }, ...decided }] }
      : { ...STATUS[tab], ...decided };
  const and: Prisma.ProductWhereInput[] = [base];
  const q = fold((sp.q ?? "").slice(0, 80));
  if (q) {
    const [cands, sups, cats] = await Promise.all([
      db.product.findMany({ where: { supplierId: { not: null } }, select: { slug: true, name: true, nameEn: true, description: true, categorySlug: true, supplierId: true } }),
      db.supplier.findMany({ select: { id: true, displayName: true } }),
      categoryLabels(),
    ]);
    const sName = new Map(sups.map((s) => [s.id, s.displayName]));
    const slugs = cands.filter((c) => fold(`${c.name} ${c.nameEn} ${c.description} ${sName.get(c.supplierId ?? "") ?? ""} ${cats.get(c.categorySlug) ?? ""} ${c.categorySlug}`).includes(q)).map((c) => c.slug);
    and.push({ slug: { in: slugs } });
  }
  if (sp.sup) and.push({ supplierId: sp.sup });
  if (sp.cat) and.push({ categorySlug: sp.cat });
  if (sp.st && ["SUBMITTED", "PUBLISHED", "REJECTED"].includes(sp.st)) and.push({ status: sp.st });
  return { AND: and };
}

function worksOrder(sp: WorkParams, tab: Tab): Prisma.ProductOrderByWithRelationInput {
  const dir = sp.dir === "asc" ? "asc" : "desc";
  if (sp.sort === "price") return { priceCents: dir };
  if (sp.sort === "date") return { decidedAt: dir };
  if (sp.sort === "wait") return { submittedAt: dir };
  if (sp.sort === "name") return { name: dir };
  if (sp.sort === "cat") return { categorySlug: dir };
  if (sp.sort === "stock") return { stock: dir };
  if (sp.sort === "status") return { status: dir };
  return tab === "pending" ? { submittedAt: "asc" } : { decidedAt: "desc" };
}

const WORK_SELECT = {
  slug: true, name: true, nameEn: true, description: true, categorySlug: true, priceCents: true, stock: true, reserved: true,
  images: true, status: true, decidedAt: true, rejectReason: true, createdByAdmin: true, supplierId: true, submittedAt: true, createdAt: true,
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
  let list = rows.map((r) => ({ ...r, submittedAt: r.submittedAt ?? r.createdAt, partner: nameOf.get(r.supplierId ?? "") ?? "" }));
  if (byPartner) {
    list.sort((a, b) => a.partner.localeCompare(b.partner) * dir);
    if (!opts.all) list = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }
  return { list, total };
}
