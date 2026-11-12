import type { PrismaClient } from "@prisma/client";

// Filtres, tri et pagination côté serveur des listes d'administration (état dans l'URL).
// Règle unique « action restante » (onglet + pastille) : colis en cours, ou remboursement à reprendre avec un paiement réel (même si expiré).
/** Anciennes commandes jamais payées, archivées : masquées de toutes les listes. */
export const NOT_ARCHIVED = { order: { archivedAt: null } };
export const TODO_WHERE = { OR: [{ status: { in: ["PENDING", "ACCEPTED", "PREPARING"] } }, { refundStatus: { in: ["MANUAL", "FAILED"] }, order: { stripePaymentIntentId: { not: null } } }] };

export const LIST_PAGE_SIZE = 25;

export type ListParams = { q?: string; st?: string; d?: string; from?: string; to?: string; sort?: string; dir?: string; p?: string };
export const LIST_KEYS = ["q", "st", "d", "from", "to", "sort", "dir", "p"] as const;

export type ListQuery = { q: string; st: string; d: string; from: Date | null; to: Date | null; asc: boolean; sort: string; page: number };

const day = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? new Date(`${s}T00:00:00.000Z`) : null);

const parisDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shift = (ymd: string, n: number) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10) + n)).toISOString().slice(0, 10);
export const PERIOD_MODES = ["all", "today", "7", "30", "custom"] as const;

/** Normalise les paramètres d'URL : statut limité aux valeurs connues, dates ISO, page ≥ 1, plage inversée corrigée. */
export function parseList(sp: ListParams, statuses: readonly string[], defaultStatus: string, sorts: readonly string[], defaultSort: string): ListQuery {
  // Période : « toutes les dates » par défaut ; une borne seule (plage personnalisée) reste ouverte.
  const d = (PERIOD_MODES as readonly string[]).includes(sp.d ?? "") ? sp.d! : sp.from || sp.to ? "custom" : "all";
  const today = parisDay(new Date());
  let from = d === "custom" ? day(sp.from) : d === "today" ? day(today) : d === "7" || d === "30" ? day(shift(today, -(Number(d) - 1))) : null;
  let to = d === "custom" ? day(sp.to) : d === "all" ? null : day(today);
  if (from && to && from > to) [from, to] = [to, from];
  return {
    d,
    q: (sp.q ?? "").trim().slice(0, 80),
    st: statuses.includes(sp.st ?? "") ? sp.st! : defaultStatus,
    from,
    to,
    sort: sorts.includes(sp.sort ?? "") ? sp.sort! : defaultSort,
    asc: sp.dir === "asc",
    page: Math.max(1, Math.trunc(Number(sp.p)) || 1),
  };
}

/** Plage de dates inclusive (fin = lendemain exclu). */
export function dateRange(q: Pick<ListQuery, "from" | "to">): { gte?: Date; lt?: Date } | undefined {
  if (!q.from && !q.to) return undefined;
  return { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: new Date(q.to.getTime() + 86_400_000) } : {}) };
}

export const pageArgs = (page: number, size = LIST_PAGE_SIZE) => ({ skip: (page - 1) * size, take: size });
export const pageCount = (total: number, size = LIST_PAGE_SIZE) => Math.max(1, Math.ceil(total / size));

// Postgres distingue la casse ; SQLite (développement) n'accepte pas l'option.
const insensitive = () => ((process.env.DATABASE_URL ?? "").startsWith("postgres") ? { mode: "insensitive" as const } : {});
export const has = (v: string) => ({ contains: v, ...insensitive() });

export const SUB_STATUSES = ["todo", "open", "SHIPPED", "DELIVERED", "closed", "all"] as const;

/** Commandes (colis) : « à traiter » = sans réponse du partenaire (escaladées) ou remboursement à reprendre. */
export function subOrdersWhere(q: ListQuery, supplierIds: string[] = []) {
  const and: object[] = [NOT_ARCHIVED];
  if (q.st === "todo") and.push(TODO_WHERE);
  else if (q.st === "open") and.push({ status: { in: ["PENDING", "ACCEPTED", "PREPARING", "SHIPPED"] } });
  else if (q.st === "SHIPPED" || q.st === "DELIVERED") and.push({ status: q.st });
  else if (q.st === "closed") and.push({ status: { in: ["REFUSED", "EXPIRED", "CANCELLED"] } });
  if (q.q) and.push({ OR: [{ number: has(q.q) }, { order: { fullName: has(q.q) } }, { order: { email: has(q.q) } }, ...(supplierIds.length ? [{ supplierId: { in: supplierIds } }] : [])] });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return and.length ? { AND: and } : {};
}

export const RETURN_FILTERS = ["REQUESTED", "ACCEPTED", "REFUNDED", "REFUSED", "all"] as const;
export function returnsWhere(q: ListQuery) {
  const and: object[] = [];
  if (q.st !== "all") and.push({ status: q.st });
  if (q.q) and.push({ OR: [{ reason: has(q.q) }, { subOrder: { number: has(q.q) } }] });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return and.length ? { AND: and } : {};
}

export const APP_STATUSES = ["PENDING", "NEEDS_INFO", "ACCEPTED", "REFUSED", "all"] as const;
export function applicationsWhere(q: ListQuery) {
  const and: object[] = [];
  if (q.st !== "all") and.push({ status: q.st });
  if (q.q) and.push({ OR: [{ name: has(q.q) }, { email: has(q.q) }, { country: has(q.q) }, { craftType: has(q.q) }] });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return and.length ? { AND: and } : {};
}

export const PARTNER_STATUSES = ["ACTIVE", "SUSPENDED", "REVOKED", "all"] as const;
export function partnersWhere(q: ListQuery) {
  const and: object[] = [];
  if (q.st !== "all") and.push({ status: q.st });
  if (q.q) and.push({ OR: [{ displayName: has(q.q) }, { country: has(q.q) }, { craftType: has(q.q) }, { user: { email: has(q.q) } }, { contactEmail: has(q.q) }] });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return and.length ? { AND: and } : {};
}


/** Versements : « à payer » = gains disponibles non versés ; « en attente » = encore dans le délai de retour ; « tous ». */
export const PAYOUT_FILTERS = ["topay", "pending", "all"] as const;
export function ledgerWhere(st: string, now: Date) {
  const open = { payoutId: null, reversedAt: null };
  if (st === "topay") return { ...open, availableAt: { lte: now } };
  if (st === "pending") return { ...open, availableAt: { gt: now } };
  return open;
}
export function payoutHistoryWhere(q: ListQuery, supplierIds: string[]) {
  const and: object[] = [];
  if (q.q) and.push({ OR: [{ reference: has(q.q) }, ...(supplierIds.length ? [{ supplierId: { in: supplierIds } }] : [])] });
  const r = dateRange(q);
  if (r) and.push({ paidAt: r });
  return and.length ? { AND: and } : {};
}
export const PARTNER_SUB_FILTERS = ["todo", "PENDING", "ship", "SHIPPED", "done", "all"] as const;
/** Espace partenaire : « à traiter » = à accepter + à expédier. */
export function partnerSubOrdersWhere(q: ListQuery, supplierId: string) {
  const and: object[] = [{ supplierId }, NOT_ARCHIVED];
  const m: Record<string, string[]> = { todo: ["PENDING", "ACCEPTED", "PREPARING"], PENDING: ["PENDING"], ship: ["ACCEPTED", "PREPARING"], SHIPPED: ["SHIPPED"], done: ["DELIVERED", "REFUSED", "EXPIRED", "CANCELLED"] };
  if (m[q.st]) and.push({ status: { in: m[q.st] } });
  if (q.q) and.push({ OR: [{ number: has(q.q) }, { order: { fullName: has(q.q) } }] });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return { AND: and };
}

export const PARTNER_SALE_FILTERS = ["pending", "available", "paid", "all"] as const;
export function partnerLedgerWhere(q: ListQuery, supplierId: string, now: Date, subOrderIds?: string[]) {
  const and: object[] = [{ supplierId }];
  if (q.st === "pending") and.push({ payoutId: null, reversedAt: null, availableAt: { gt: now } });
  else if (q.st === "available") and.push({ payoutId: null, reversedAt: null, availableAt: { lte: now } });
  else if (q.st === "paid") and.push({ payoutId: { not: null } });
  if (subOrderIds) and.push({ subOrderId: { in: subOrderIds } });
  const r = dateRange(q);
  if (r) and.push({ createdAt: r });
  return { AND: and };
}

/** Pastilles du menu partenaire : colis à accepter ou à expédier, créations refusées. */
export async function partnerCounts(db: PrismaClient, supplierId: string) {
  const [orders, works] = await Promise.all([
    db.subOrder.count({ where: { supplierId, status: { in: ["PENDING", "ACCEPTED", "PREPARING"] }, ...NOT_ARCHIVED } }),
    db.product.count({ where: { supplierId, status: "REJECTED" } }),
  ]);
  return { orders, works };
}

/** Compteurs des pastilles de l'administration (5 comptages indexés, aucune lecture de lignes). */
export async function adminCounts(db: PrismaClient, now = new Date()) {
  const [applications, creations, orders, returns, payoutGroups] = await Promise.all([
    db.supplierApplication.count({ where: { status: "PENDING" } }),
    db.product.count({ where: { status: "SUBMITTED" } }),
    db.subOrder.count({ where: { AND: [TODO_WHERE, NOT_ARCHIVED] } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.ledgerEntry.groupBy({ by: ["supplierId"], where: { payoutId: null, reversedAt: null, availableAt: { lte: now } } }),
  ]);
  return { applications, creations, orders, returns, payouts: payoutGroups.length };
}
