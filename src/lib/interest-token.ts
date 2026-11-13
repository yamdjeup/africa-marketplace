const KEY = "afrique-marketplace:interest-token:v1";

/** Jeton aléatoire anonyme du navigateur (aucun lien avec un compte). */
export function interestToken(): string {
  try {
    let t = localStorage.getItem(KEY);
    if (!t || !/^[A-Za-z0-9-]{16,64}$/.test(t)) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return "00000000-0000-4000-8000-000000000000";
  }
}
