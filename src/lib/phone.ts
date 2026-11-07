// Indicatifs pays et validation E.164 (national : longueurs par pays ; défaut 6–12 chiffres).
export const DIAL: Record<string, string> = {
  FR: "33", BE: "32", CH: "41", LU: "352", DE: "49", ES: "34", IT: "39", NL: "31", GB: "44", US: "1", CA: "1",
  SN: "221", CI: "225", CM: "237", CD: "243", CG: "242", GA: "241", ML: "223", BF: "226", BJ: "229", TG: "228",
  NE: "227", GN: "224", MG: "261", MA: "212", DZ: "213", TN: "216", NG: "234", GH: "233", KE: "254", ET: "251",
  ZA: "27", AO: "244", HT: "509", GP: "590", MQ: "596", RE: "262", GF: "594", PT: "351", BR: "55",
};

// [min, max] chiffres du numéro national (sans 0 initial).
const LEN: Record<string, [number, number]> = {
  FR: [9, 9], BE: [8, 9], CH: [9, 9], LU: [8, 9], DE: [10, 11], ES: [9, 9], IT: [9, 10], NL: [9, 9], GB: [10, 10], US: [10, 10], CA: [10, 10],
};

export const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export function dialOf(code: string) {
  return DIAL[code.toUpperCase()] ?? "";
}

/** Numéro national saisi + pays → E.164 (« +33612345678 ») ou null si invalide. */
export function toE164(code: string, raw: string): string | null {
  const dial = dialOf(code);
  if (!dial) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
    if (!digits.startsWith(dial)) return null;
    digits = digits.slice(dial.length);
  } else if (digits.startsWith("00" + dial)) digits = digits.slice(2 + dial.length);
  digits = digits.replace(/^0+/, "");
  const [min, max] = LEN[code.toUpperCase()] ?? [6, 12];
  if (!/^\d+$/.test(digits) || digits.length < min || digits.length > max) return null;
  return `+${dial}${digits}`;
}

export const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);

/** Sépare un E.164 en [indicatif pays ISO, numéro national] pour pré-remplir le champ. */
export function splitE164(v: string, fallback: string): { code: string; national: string } {
  if (!isE164(v)) return { code: fallback, national: v };
  const digits = v.slice(1);
  const hit = Object.entries(DIAL).filter(([, d]) => digits.startsWith(d)).sort((a, b) => b[1].length - a[1].length)[0];
  return hit ? { code: hit[0], national: digits.slice(hit[1].length) } : { code: fallback, national: v };
}
