import { after } from "next/server";
import { runAlerts } from "@/lib/alerts";

/** Envoi immédiat des alertes « de nouveau disponible » (le cron quotidien reste le filet de sécurité). */
export function flushRestockAlerts() {
  const run = () => runAlerts(20).catch(() => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Appel sûr depuis les libs testables : n'échoue jamais, ne charge next qu'à la demande. */
export async function flushRestockSafe() {
  try {
    (await import("./restock-flush")).flushRestockAlerts();
  } catch {
    // hors contexte serveur (tests) : le cron prendra le relais
  }
}
