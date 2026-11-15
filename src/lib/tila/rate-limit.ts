import { createHash } from "node:crypto";

type HitDb = {
  tilaRateHit: {
    count(args: { where: { key: string; createdAt: { gte: Date } } }): Promise<number>;
    create(args: { data: { key: string; createdAt?: Date } }): Promise<unknown>;
    deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<unknown>;
  };
};

export const LIMITS = { ip: { max: 30, windowMs: 3_600_000 }, user: { max: 60, windowMs: 3_600_000 } } as const;

export const ipKey = (ip: string) => `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
export const userKey = (userId: string) => `user:${userId}`;

/** Compte un message ; refuse (sans l'enregistrer) quand le plafond de la fenêtre est atteint. */
export async function consume(db: HitDb, key: string, max: number, windowMs: number, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - windowMs);
  if ((await db.tilaRateHit.count({ where: { key, createdAt: { gte: since } } })) >= max) return false;
  await db.tilaRateHit.create({ data: { key, createdAt: now } });
  // Nettoyage opportuniste des lignes de plus d'un jour.
  if (Math.random() < 0.02) await db.tilaRateHit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 86_400_000) } } });
  return true;
}

export async function checkRate(db: HitDb, ip: string, userId?: string, now = new Date()): Promise<boolean> {
  if (!(await consume(db, ipKey(ip), LIMITS.ip.max, LIMITS.ip.windowMs, now))) return false;
  if (userId && !(await consume(db, userKey(userId), LIMITS.user.max, LIMITS.user.windowMs, now))) return false;
  return true;
}
