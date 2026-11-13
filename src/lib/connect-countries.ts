// Pays africains listés par Stripe (page Global Payouts « recipient countries », lue par l'utilisateur le 13/11/2026).
// Absents de la liste : Cameroun, Nigeria, Ghana, RDC, Mali, Burkina Faso. Ne rien promettre dans l'UI : Stripe reste juge.
export const CONNECT_COUNTRIES: Record<string, string[]> = {
  BJ: ["benin"],
  CI: ["cote d'ivoire", "cote divoire", "ivory coast"],
  SN: ["senegal"],
  ZA: ["afrique du sud", "south africa"],
  DZ: ["algerie", "algeria"],
  BW: ["botswana"],
  EG: ["egypte", "egypt"],
  ET: ["ethiopie", "ethiopia"],
  GM: ["gambie", "gambia"],
  KE: ["kenya"],
  MG: ["madagascar"],
  MA: ["maroc", "morocco"],
  MU: ["maurice", "mauritius"],
  MZ: ["mozambique"],
  NA: ["namibie", "namibia"],
  RW: ["rwanda"],
  TZ: ["tanzanie", "tanzania"],
  TN: ["tunisie", "tunisia"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’`]/g, "'").trim().toLowerCase();

/** Code ISO si le pays saisi (code ou nom FR/EN) figure dans la liste Stripe, sinon null. */
export function supportedCountryCode(input: string | null | undefined): string | null {
  const v = norm(input ?? "");
  if (!v) return null;
  const up = v.toUpperCase();
  if (CONNECT_COUNTRIES[up]) return up;
  for (const [code, names] of Object.entries(CONNECT_COUNTRIES)) if (names.includes(v)) return code;
  return null;
}
