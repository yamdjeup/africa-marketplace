import "server-only";
import { normalizeText } from "@/lib/address";

export type Suggestion = {
  label: string;
  placeId?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  countryCode: string;
};

export interface AddressProvider {
  name: "photon" | "google";
  /** null = fournisseur indisponible (la saisie manuelle prend le relais, sans erreur visible). */
  suggest(q: string, locale: string, countryCode?: string): Promise<Suggestion[] | null>;
  /** Complète une suggestion qui ne contient pas encore les composants d'adresse. */
  resolve?(placeId: string, locale: string): Promise<Suggestion | null>;
}

const TIMEOUT_MS = 4000;

// Photon (Komoot), basé sur OpenStreetMap : gratuit et sans clé, mais sans garantie de service.
// Usage raisonnable demandé (pas de requêtes en rafale) ; données © contributeurs OpenStreetMap (ODbL).
const photon: AddressProvider = {
  name: "photon",
  async suggest(q, locale, countryCode) {
    try {
      const url = new URL("https://photon.komoot.io/api/");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "8");
      url.searchParams.set("lang", locale === "en" ? "en" : "fr");
      const res = await fetch(url, { headers: { "User-Agent": "epomta-demo/1.0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return null;
      const data = (await res.json()) as { features?: { properties: Record<string, string> }[] };
      return (data.features ?? [])
        .map(({ properties: p }) => ({
          label: [[p.street ?? p.name, p.housenumber].filter(Boolean).join(" "), [p.postcode, p.city ?? p.name].filter(Boolean).join(" "), p.country].filter(Boolean).join(", "),
          street: p.street ?? (p.housenumber || !p.city ? p.name ?? "" : ""),
          houseNumber: p.housenumber ?? "",
          postalCode: p.postcode ?? "",
          city: p.city ?? p.locality ?? p.district ?? "",
          countryCode: (p.countrycode ?? "").toUpperCase(),
        }))
        .filter((s) => (!countryCode || s.countryCode === countryCode) && (s.street || s.city));
    } catch {
      return null;
    }
  },
};

type GoogleComponent = { longText?: string; shortText?: string; types: string[] };

// Google Places (New) : actif uniquement si GOOGLE_PLACES_API_KEY existe (clé côté serveur, jamais exposée).
function google(key: string): AddressProvider {
  const headers = { "Content-Type": "application/json", "X-Goog-Api-Key": key };
  return {
    name: "google",
    async suggest(q, locale, countryCode) {
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers,
          body: JSON.stringify({
            input: q,
            languageCode: locale === "en" ? "en" : "fr",
            ...(countryCode ? { includedRegionCodes: [countryCode.toLowerCase()] } : {}),
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[] };
        return (data.suggestions ?? [])
          .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
          .slice(0, 6)
          .map((p) => ({ label: p.text.text, placeId: p.placeId, street: "", houseNumber: "", postalCode: "", city: "", countryCode: "" }));
      } catch {
        return null;
      }
    },
    async resolve(placeId, locale) {
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${locale === "en" ? "en" : "fr"}`, {
          headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "addressComponents,formattedAddress" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { addressComponents?: GoogleComponent[]; formattedAddress?: string };
        const part = (type: string, short = false) => {
          const c = data.addressComponents?.find((x) => x.types.includes(type));
          return (short ? c?.shortText : c?.longText) ?? "";
        };
        return {
          label: data.formattedAddress ?? "",
          placeId,
          street: part("route"),
          houseNumber: part("street_number"),
          postalCode: part("postal_code"),
          city: part("locality") || part("postal_town") || part("sublocality"),
          countryCode: part("country", true).toUpperCase(),
        };
      } catch {
        return null;
      }
    },
  };
}

export function getAddressProvider(): AddressProvider {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return key ? google(key) : photon;
}

/** Cohérence code postal / ville : « unknown » si le fournisseur est indisponible ou sans résultat. */
export async function checkPostalCity(postalCode: string, city: string, countryCode: string, locale: string): Promise<"ok" | "mismatch" | "unknown"> {
  const provider = getAddressProvider();
  const list = await provider.suggest(`${postalCode} ${city}`, locale, countryCode || undefined);
  if (!list || list.length === 0) return "unknown";
  const candidates = provider.resolve ? (await Promise.all(list.slice(0, 3).map((s) => (s.placeId ? provider.resolve!(s.placeId, locale) : null)))).filter((s): s is Suggestion => Boolean(s)) : list;
  if (candidates.length === 0) return "unknown";
  const pc = postalCode.replace(/\s/g, "").toUpperCase();
  const c = normalizeText(city);
  const samePostal = candidates.filter((s) => s.postalCode.replace(/\s/g, "").toUpperCase() === pc);
  if (samePostal.length === 0) return "unknown";
  const match = samePostal.some((s) => {
    const sc = normalizeText(s.city);
    return sc && (sc.includes(c) || c.includes(sc));
  });
  return match ? "ok" : "mismatch";
}
