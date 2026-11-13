import type { PrismaClient } from "@prisma/client";

export const INTEREST_MINUTES = 30;
export const INTEREST_POLL_MS = 5000;
const TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;

export const validToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

/** Remplace l'ensemble des pièces au panier d'un navigateur (jeton anonyme) ; une liste vide retire tout. */
export async function syncInterest(db: PrismaClient, token: string, slugs: string[], now = new Date()) {
  const list = [...new Set(slugs.filter((s) => typeof s === "string" && s.length > 0 && s.length <= 120))].slice(0, 50);
  await db.cartInterest.deleteMany({ where: { token, slug: { notIn: list } } });
  for (const slug of list) {
    await db.cartInterest.upsert({ where: { token_slug: { token, slug } }, create: { token, slug, updatedAt: now }, update: { updatedAt: now } });
  }
  await db.cartInterest.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } } });
}

/** Un AUTRE navigateur a-t-il la pièce dans son panier (non expiré) ? Booléen uniquement, aucune identité. */
export async function othersHaveInCart(db: PrismaClient, slug: string, token: string, now = new Date()) {
  const n = await db.cartInterest.count({
    where: { slug, token: { not: token }, updatedAt: { gt: new Date(now.getTime() - INTEREST_MINUTES * 60 * 1000) } },
  });
  return n > 0;
}
