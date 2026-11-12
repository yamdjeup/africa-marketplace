// Réveil d'une base Neon suspendue (cold start) : retry avec backoff, sans dépendance serveur.
export const isUnreachable = (text: string) => /P1001|Can't reach database server|ECONNREFUSED|ETIMEDOUT|timed out/i.test(text);

/** Ajoute connect_timeout si absent (secondes). */
export function withConnectTimeout(url: string, seconds = 30) {
  if (/[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=${seconds}`;
}

export type RetryOpts = { delaysMs?: number[]; sleep?: (ms: number) => Promise<void>; retryable?: (e: unknown) => boolean; onRetry?: (n: number, e: unknown) => void };

/** Exécute fn ; réessaie sur erreur « injoignable » avec les délais donnés (≈ 60 s au total par défaut). */
export async function retry<T>(fn: () => Promise<T>, o: RetryOpts = {}): Promise<T> {
  const delays = o.delaysMs ?? [2000, 4000, 8000, 12000, 16000, 18000];
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const retryable = o.retryable ?? ((e: unknown) => isUnreachable(String((e as Error)?.message ?? e)));
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= delays.length || !retryable(e)) throw e;
      o.onRetry?.(i + 1, e);
      await sleep(delays[i]);
    }
  }
}

import { connect } from "node:net";

/** Ouverture TCP vers l'hôte de l'URL (réveille le compute Neon) ; rejette « ETIMEDOUT/ECONNREFUSED » pour le retry. */
export function tcpProbe(url: string, timeoutMs = 10000): Promise<void> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const s = connect({ host: u.hostname.replace(/^\[|\]$/g, ""), port: Number(u.port || 5432) });
    s.setTimeout(timeoutMs, () => { s.destroy(); reject(new Error("ETIMEDOUT P1001 (TCP)")); });
    s.once("connect", () => { s.end(); resolve(); });
    s.once("error", (e) => { s.destroy(); reject(new Error(`P1001 ${e.message}`)); });
  });
}

export const UNREACHABLE_HELP =
  "Base de test injoignable (P1001) après plusieurs essais. Vérifier : compute Neon actif (ouvrir la branche dans la console Neon), URL directe (sans -pooler) avec sslmode=require, identifiants corrects, réseau sortant vers le port 5432.";
