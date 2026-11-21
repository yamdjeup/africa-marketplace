import type { PrismaClient } from "@prisma/client";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const ok = (n: number) => (n === 1 ? ("ok" as const) : ("missing" as const));

// ---- Motifs de retour (client) ----
export type ReturnReasonRow = { id: string; fr: string; en: string; requiresPhotos: boolean; position: number; active: boolean };

export const listReturnReasons = (db: PrismaClient, activeOnly = true): Promise<ReturnReasonRow[]> =>
  db.returnReason.findMany({ where: activeOnly ? { active: true } : {}, orderBy: [{ position: "asc" }, { id: "asc" }] });

export async function addReturnReason(db: PrismaClient, fr: string, en: string, requiresPhotos = false) {
  const f = clean(fr), e = clean(en);
  if (f.length < 3 || e.length < 3) return "invalid" as const;
  const last = await db.returnReason.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await db.returnReason.create({ data: { fr: f, en: e, requiresPhotos, position: (last?.position ?? 0) + 1 } });
  return "ok" as const;
}

export async function editReturnReason(db: PrismaClient, id: string, fr: string, en: string, requiresPhotos: boolean) {
  const f = clean(fr), e = clean(en);
  if (f.length < 3 || e.length < 3) return "invalid" as const;
  return ok((await db.returnReason.updateMany({ where: { id }, data: { fr: f, en: e, requiresPhotos } })).count);
}

export async function setReturnReasonActive(db: PrismaClient, id: string, active: boolean) {
  return ok((await db.returnReason.updateMany({ where: { id }, data: { active } })).count);
}

/** Suppression refusée si une demande de retour utilise déjà le motif. */
export async function deleteReturnReason(db: PrismaClient, id: string) {
  if ((await db.returnRequest.count({ where: { reasonId: id } })) > 0) return "used" as const;
  return ok((await db.returnReason.deleteMany({ where: { id } })).count);
}

export async function moveReturnReason(db: PrismaClient, id: string, dir: "up" | "down") {
  const all = await db.returnReason.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] });
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return "missing" as const;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return "ok" as const;
  const next = all.slice();
  [next[i], next[j]] = [next[j], next[i]];
  await db.$transaction(next.map((r, idx) => db.returnReason.update({ where: { id: r.id }, data: { position: idx + 1 } })));
  return "ok" as const;
}

// ---- Transporteurs ----
export type CarrierRow = { id: string; name: string; position: number; active: boolean };

export const listCarriers = (db: PrismaClient, activeOnly = true): Promise<CarrierRow[]> =>
  db.carrier.findMany({ where: activeOnly ? { active: true } : {}, orderBy: [{ position: "asc" }, { id: "asc" }] });

/** Noms des transporteurs actifs ; repli sur la liste d'origine si la table est vide ou illisible. */
export async function activeCarrierNames(db: PrismaClient, fallback: readonly string[]): Promise<string[]> {
  const rows = await listCarriers(db).catch(() => []);
  return rows.length ? rows.map((r) => r.name) : [...fallback];
}

const POPULAR_CARRIERS = ["UPS", "DHL", "FedEx", "Colissimo", "Chronopost"];

/** Populaires en tête (ordre fixe), puis le reste dans l'ordre reçu. */
export function sortCarriers(names: string[]): string[] {
  const low = (s: string) => s.toLowerCase();
  const head = POPULAR_CARRIERS.map((p) => names.find((n) => low(n) === low(p))).filter((n): n is string => !!n);
  return [...head, ...names.filter((n) => !head.includes(n))];
}

export async function addCarrier(db: PrismaClient, name: string) {
  const n = clean(name, 60);
  if (n.length < 2) return "invalid" as const;
  if (await db.carrier.findUnique({ where: { name: n } })) return "exists" as const;
  const last = await db.carrier.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await db.carrier.create({ data: { name: n, position: (last?.position ?? 0) + 1 } });
  return "ok" as const;
}

export async function editCarrier(db: PrismaClient, id: string, name: string) {
  const n = clean(name, 60);
  if (n.length < 2) return "invalid" as const;
  const dup = await db.carrier.findFirst({ where: { name: n, NOT: { id } } });
  if (dup) return "exists" as const;
  return ok((await db.carrier.updateMany({ where: { id }, data: { name: n } })).count);
}

export async function setCarrierActive(db: PrismaClient, id: string, active: boolean) {
  return ok((await db.carrier.updateMany({ where: { id }, data: { active } })).count);
}

/** Suppression refusée si un colis expédié utilise ce transporteur. */
export async function deleteCarrier(db: PrismaClient, id: string) {
  const c = await db.carrier.findUnique({ where: { id } });
  if (!c) return "missing" as const;
  if ((await db.subOrder.count({ where: { carrier: c.name } })) > 0) return "used" as const;
  await db.carrier.delete({ where: { id } });
  return "ok" as const;
}

export async function moveCarrier(db: PrismaClient, id: string, dir: "up" | "down") {
  const all = await db.carrier.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] });
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return "missing" as const;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return "ok" as const;
  const next = all.slice();
  [next[i], next[j]] = [next[j], next[i]];
  await db.$transaction(next.map((r, idx) => db.carrier.update({ where: { id: r.id }, data: { position: idx + 1 } })));
  return "ok" as const;
}
