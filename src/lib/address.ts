import { REGIONS } from "@/data/regions";
import { dialOf, isE164 } from "@/lib/phone";

export type Country = { code: string; fr: string; en: string };

// Pays hors sélecteur de région, utiles pour des adresses de livraison (diaspora).
const EXTRA: Country[] = [
  { code: "BE", fr: "Belgique", en: "Belgium" },
  { code: "CH", fr: "Suisse", en: "Switzerland" },
  { code: "LU", fr: "Luxembourg", en: "Luxembourg" },
  { code: "DE", fr: "Allemagne", en: "Germany" },
  { code: "ES", fr: "Espagne", en: "Spain" },
  { code: "IT", fr: "Italie", en: "Italy" },
  { code: "NL", fr: "Pays-Bas", en: "Netherlands" },
  { code: "GB", fr: "Royaume-Uni", en: "United Kingdom" },
  { code: "US", fr: "États-Unis", en: "United States" },
  { code: "CA", fr: "Canada", en: "Canada" },
];

export const COUNTRIES: Country[] = [...REGIONS.map(({ code, fr, en }) => ({ code, fr, en })), ...EXTRA];

// Format du code postal par pays ; absent = pas de système postal courant (champ facultatif).
const POSTAL: Record<string, { re: string; example: string }> = {
  FR: { re: "\\d{5}", example: "75010" },
  BE: { re: "\\d{4}", example: "1180" },
  CH: { re: "\\d{4}", example: "1003" },
  LU: { re: "\\d{4}", example: "1111" },
  DE: { re: "\\d{5}", example: "10115" },
  ES: { re: "\\d{5}", example: "28001" },
  IT: { re: "\\d{5}", example: "00184" },
  NL: { re: "\\d{4} ?[A-Za-z]{2}", example: "1011 AB" },
  GB: { re: "[A-Za-z]{1,2}\\d[A-Za-z\\d]? ?\\d[A-Za-z]{2}", example: "SW1A 1AA" },
  US: { re: "\\d{5}(-\\d{4})?", example: "10001" },
  CA: { re: "[A-Za-z]\\d[A-Za-z] ?\\d[A-Za-z]\\d", example: "H2Y 1C6" },
  DZ: { re: "\\d{5}", example: "16000" },
  EG: { re: "\\d{5}", example: "11511" },
  ET: { re: "\\d{4}", example: "1000" },
  KE: { re: "\\d{5}", example: "00100" },
  MA: { re: "\\d{5}", example: "20000" },
  NG: { re: "\\d{6}", example: "100001" },
  SN: { re: "\\d{5}", example: "12500" },
  TN: { re: "\\d{4}", example: "1002" },
  ZA: { re: "\\d{4}", example: "8001" },
  MG: { re: "\\d{3}", example: "101" },
  MU: { re: "\\d{5}", example: "11302" },
};

const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export function countryByName(name: string): Country | undefined {
  const n = plain(name);
  return COUNTRIES.find((c) => plain(c.fr) === n || plain(c.en) === n || c.code.toLowerCase() === n);
}

export function postalRule(countryName: string) {
  const c = countryByName(countryName);
  return c ? POSTAL[c.code] ?? null : null;
}

export function validatePostal(countryName: string, postalCode: string): { ok: boolean; required: boolean; example?: string } {
  const rule = postalRule(countryName);
  if (!rule) return { ok: true, required: false };
  return { ok: new RegExp(`^${rule.re}$`).test(postalCode.trim()), required: true, example: rule.example };
}

export type StreetParts = { line1: string; houseNumber?: string | null; box?: string | null; line2?: string | null; country: string };

// Composition normalisée : « 12 rue des Arts » (FR, pays africains…) ou « Rue X 12 » (Belgique et pays voisins).
export function formatStreet(a: StreetParts, locale: "fr" | "en" = "fr"): string {
  const code = countryByName(a.country)?.code;
  const number = (a.houseNumber ?? "").trim();
  const street = a.line1.trim();
  const numberAfter = code && ["BE", "NL", "DE", "CH", "LU", "ES", "IT"].includes(code);
  const main = numberAfter ? [street, number].filter(Boolean).join(" ") : [number, street].filter(Boolean).join(" ");
  const box = (a.box ?? "").trim();
  const boxPart = box ? (code === "BE" ? ` bte ${box}` : locale === "fr" ? ` (boîte ${box})` : ` (box ${box})`) : "";
  const complement = (a.line2 ?? "").trim();
  return `${main}${boxPart}${complement ? `, ${complement}` : ""}`;
}

export type AddressFieldValues = {
  firstName: string;
  lastName: string;
  country: string;
  line1: string;
  houseNumber: string;
  box: string;
  line2: string;
  postalCode: string;
  city: string;
  phone: string;
};

export const EMPTY_ADDRESS: AddressFieldValues = {
  firstName: "",
  lastName: "",
  country: "",
  line1: "",
  houseNumber: "",
  box: "",
  line2: "",
  postalCode: "",
  city: "",
  phone: "",
};

// Contrôle serveur commun (carnet d'adresses et commande).
export function checkAddress(v: AddressFieldValues): "required" | "postal" | null {
  if (!v.firstName || !v.lastName || !v.line1 || !v.city || !v.country || !v.phone) return "required";
  // Téléphone attendu en E.164 (le champ à indicatif l'envoie ainsi) ; pays sans indicatif connu : saisie libre.
  const cc = countryByName(v.country)?.code;
  if (cc && dialOf(cc) && !isE164(v.phone)) return "required";
  const p = validatePostal(v.country, v.postalCode);
  if (p.required && !v.postalCode) return "required";
  if (!p.ok) return "postal";
  return null;
}

export function readAddress(get: (name: string) => string): AddressFieldValues {
  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    country: get("country"),
    line1: get("line1"),
    houseNumber: get("houseNumber"),
    box: get("box"),
    line2: get("line2"),
    postalCode: get("postalCode"),
    city: get("city"),
    phone: get("phone"),
  };
}

export const normalizeText = plain;
