/** Période obligatoire AAAA-MM-JJ (UTC), bornes incluses ; null si absente ou invalide. */
export function parsePeriod(from?: string | null, to?: string | null): { from: Date; to: Date } | null {
  const ok = (v?: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
  if (!ok(from) || !ok(to)) return null;
  const a = new Date(`${from}T00:00:00.000Z`);
  const b = new Date(`${to}T23:59:59.999Z`);
  return a <= b ? { from: a, to: b } : null;
}
