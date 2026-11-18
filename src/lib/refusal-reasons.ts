import type { PrismaClient } from "@prisma/client";

export const REASON_KINDS = ["ORDER", "RETURN"] as const;
export type ReasonKind = (typeof REASON_KINDS)[number];

export type ReasonRow = { id: string; kind: string; fr: string; en: string; position: number; active: boolean };

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
export const isKind = (k: unknown): k is ReasonKind => (REASON_KINDS as readonly string[]).includes(String(k));

/** Motifs d'un type, dans l'ordre d'affichage ; seuls les actifs sont proposés aux créateurs. */
export const listReasons = (db: PrismaClient, kind: ReasonKind, activeOnly = true): Promise<ReasonRow[]> =>
  db.refusalReason.findMany({ where: { kind, ...(activeOnly ? { active: true } : {}) }, orderBy: [{ position: "asc" }, { id: "asc" }] });

/** Motif actif du bon type, sinon null (empêche un identifiant forgé ou désactivé). */
export const findActiveReason = (db: PrismaClient, kind: ReasonKind, id: unknown) =>
  clean(id, 60) ? db.refusalReason.findFirst({ where: { id: clean(id, 60), kind, active: true } }) : Promise.resolve(null);

/** Libellé client d'un motif (même désactivé : un ancien refus garde sa formulation). */
export async function reasonLabel(db: PrismaClient, id: string | null | undefined, locale: "fr" | "en") {
  if (!id) return null;
  const r = await db.refusalReason.findUnique({ where: { id }, select: { fr: true, en: true } });
  return r ? (locale === "en" ? r.en : r.fr) : null;
}

export async function addReason(db: PrismaClient, kind: ReasonKind, fr: string, en: string) {
  const f = clean(fr), e = clean(en);
  if (f.length < 3 || e.length < 3) return "invalid" as const;
  const last = await db.refusalReason.findFirst({ where: { kind }, orderBy: { position: "desc" }, select: { position: true } });
  await db.refusalReason.create({ data: { kind, fr: f, en: e, position: (last?.position ?? 0) + 1, active: true } });
  return "ok" as const;
}

export async function editReason(db: PrismaClient, id: string, fr: string, en: string) {
  const f = clean(fr), e = clean(en);
  if (f.length < 3 || e.length < 3) return "invalid" as const;
  const n = await db.refusalReason.updateMany({ where: { id }, data: { fr: f, en: e } });
  return n.count === 1 ? ("ok" as const) : ("missing" as const);
}

/** Active ou désactive : jamais de suppression, les anciens refus gardent leur motif. */
export async function setReasonActive(db: PrismaClient, id: string, active: boolean) {
  const n = await db.refusalReason.updateMany({ where: { id }, data: { active } });
  return n.count === 1 ? ("ok" as const) : ("missing" as const);
}

/** Échange la position avec le voisin (haut/bas) du même type. */
export async function moveReason(db: PrismaClient, id: string, dir: "up" | "down") {
  const cur = await db.refusalReason.findUnique({ where: { id } });
  if (!cur) return "missing" as const;
  const all = await db.refusalReason.findMany({ where: { kind: cur.kind }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  const i = all.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return "ok" as const;
  const next = all.slice();
  [next[i], next[j]] = [next[j], next[i]];
  await db.$transaction(next.map((r, idx) => db.refusalReason.update({ where: { id: r.id }, data: { position: idx + 1 } })));
  return "ok" as const;
}
