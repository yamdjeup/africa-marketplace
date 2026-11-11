const ALLOWED_HOSTS = new Set(["epomta.com", "www.epomta.com", "epomta-demo.vercel.app"]);

/** Origine de retour (Stripe, liens) : le domaine de la requête s'il est autorisé, sinon l'origine configurée. */
export function returnOrigin(host: string | null | undefined, fallback: string): string {
  const h = (host ?? "").split(",")[0].trim().toLowerCase();
  if (h && ALLOWED_HOSTS.has(h)) return `https://${h}`;
  return fallback.replace(/\/$/, "");
}
