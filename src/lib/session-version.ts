/** Un jeton sans version est traité comme version 0 ; toute différence avec la base invalide la session. */
export function sessionVersionValid(tokenVersion: unknown, dbVersion: number | null | undefined): boolean {
  if (dbVersion === null || dbVersion === undefined) return false;
  const v = typeof tokenVersion === "number" && Number.isInteger(tokenVersion) ? tokenVersion : 0;
  return v === dbVersion;
}
