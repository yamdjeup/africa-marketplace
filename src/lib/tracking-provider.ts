import { createHash, timingSafeEqual } from "node:crypto";

/** Mise à jour de suivi normalisée, indépendante de l'agrégateur. */
export type TrackingUpdate = { number: string; carrierCode: number | null; delivered: boolean; status: string };

/** Adaptateur remplaçable : 17TRACK aujourd'hui, un autre agrégateur demain. */
export interface TrackingProvider {
  /** Enregistre un colis à suivre ; ne lève jamais, retourne false en cas d'échec. */
  register(number: string, carrierCode: number | null): Promise<boolean>;
  /** Relit le statut de colis déjà enregistrés (rattrapage si le webhook est manqué) ; ne lève jamais. */
  getInfo(items: { number: string; carrierCode: number | null }[]): Promise<TrackingUpdate[]>;
  /** Vérifie l'authenticité d'une notification ; null si invalide ou sans objet. */
  parseWebhook(rawBody: string, signature: string | null): TrackingUpdate | null;
}

/** Codes transporteurs 17TRACK (carriers.csv fourni) ; null = détection automatique par l'agrégateur. */
export function carrierCodeFor(name: string): number | null {
  const n = name.trim().toLowerCase();
  if (/dhl\s*express/.test(n)) return 100001;
  if (/\bups\b/.test(n)) return 100002;
  if (/fedex/.test(n)) return 100003;
  if (/chronopost/.test(n)) return 100273;
  if (/colissimo|la\s*poste/.test(n)) return 6051;
  if (/bpost/.test(n)) return 2061;
  if (/\bems\b/.test(n)) return 100685;
  if (/dpd/.test(n)) return /\b(be|belgi)/.test(n) ? 100321 : /\b(de|german|allemagne)/.test(n) ? 100007 : 100072;
  return null;
}

const BASE = "https://api.17track.net/track/v2.4";

export function createTrack17Provider(apiKey: string, f: typeof fetch = fetch): TrackingProvider {
  return {
    async register(number, carrierCode) {
      try {
        const item: Record<string, unknown> = { number };
        if (carrierCode) item.carrier = carrierCode;
        const post = async (path: string, payload: unknown) => {
          const res = await f(`${BASE}/${path}`, { method: "POST", headers: { "17token": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) return null;
          return (await res.json()) as { code?: number; data?: { accepted?: { number?: string; track_info?: { latest_status?: { status?: string } }; carrier?: number }[]; rejected?: { number?: string; error?: { code?: number; message?: string } }[] } };
        };
        const j = await post("register", [item]);
        if (!j) return false;
        if (j.code === 0 && (j.data?.accepted?.length ?? 0) > 0) return true;
        const rej = j.data?.rejected?.[0]?.error;
        console.error("[17track] register rejected", number, rej?.code, rej?.message);
        // Déjà enregistré (souvent sous un autre code transporteur) : on corrige le transporteur.
        if (rej?.code === -18019901 && carrierCode) {
          const c = await post("changecarrier", [{ number, carrier_new: carrierCode }]);
          const ok = c?.code === 0 && (c.data?.accepted?.length ?? 0) > 0;
          if (!ok) console.error("[17track] changecarrier rejected", number, c?.data?.rejected?.[0]?.error?.code);
          return ok;
        }
        return false;
      } catch (e) {
        console.error("[17track] register", e instanceof Error ? e.message : e);
        return false;
      }
    },
    async getInfo(items) {
      try {
        const res = await f(`${BASE}/gettrackinfo`, { method: "POST", headers: { "17token": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(items.map((i) => (i.carrierCode ? { number: i.number, carrier: i.carrierCode } : { number: i.number }))) });
        if (!res.ok) return [];
        const j = (await res.json()) as { data?: { accepted?: { number?: string; carrier?: number; track_info?: { latest_status?: { status?: string } } }[]; rejected?: { number?: string; error?: { code?: number } }[] } };
        for (const r of j.data?.rejected ?? []) console.error("[17track] gettrackinfo rejected", r.number, r.error?.code);
        return (j.data?.accepted ?? []).filter((a) => a.number).map((a) => { const status = a.track_info?.latest_status?.status ?? ""; return { number: a.number!, carrierCode: a.carrier ?? null, delivered: status === "Delivered", status }; });
      } catch (e) {
        console.error("[17track] gettrackinfo", e instanceof Error ? e.message : e);
        return [];
      }
    },
    parseWebhook(rawBody, signature) {
      // Signature 17TRACK : SHA-256 hex de « corps brut + "/" + clé API » (en-tête « sign »).
      const expected = createHash("sha256").update(`${rawBody}/${apiKey}`, "utf8").digest("hex");
      const got = (signature ?? "").trim().toLowerCase();
      if (got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return null;
      try {
        const j = JSON.parse(rawBody) as { event?: string; data?: { number?: string; carrier?: number; track_info?: { latest_status?: { status?: string } } } };
        if (j.event !== "TRACKING_UPDATED" || !j.data?.number) return null;
        const status = j.data.track_info?.latest_status?.status ?? "";
        return { number: j.data.number, carrierCode: j.data.carrier ?? null, delivered: status === "Delivered", status };
      } catch {
        return null;
      }
    },
  };
}

/** Sans TRACK17_API_KEY : mode manuel dégradé (null). */
export function getTrackingProvider(): TrackingProvider | null {
  const key = process.env.TRACK17_API_KEY;
  return key ? createTrack17Provider(key) : null;
}

/** Enregistrement au mieux, sans jamais bloquer l'expédition. */
export async function registerTracking(carrier: string, number: string, provider: TrackingProvider | null = getTrackingProvider()) {
  if (!provider || !number) return false;
  return provider.register(number, carrierCodeFor(carrier));
}
