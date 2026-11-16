// URL du site utilisé par la démo (catalogue en lecture seule + paiement Stripe en mode test).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://simu.epomta.com").replace(/\/$/, "");
