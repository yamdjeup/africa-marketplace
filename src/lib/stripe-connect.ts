// Stripe Connect (comptes Express, sandbox) : charges séparées + transferts au versement. Appels REST via fetch (injectable pour les tests).
export type ConnectStatus = "NONE" | "PENDING" | "RESTRICTED" | "ACTIVE";

export type StripeAccountLike = {
  id?: string;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  capabilities?: { transfers?: string };
  requirements?: { currently_due?: string[] };
};

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: URLSearchParams }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const API = "https://api.stripe.com/v1";

export function connectState(a: StripeAccountLike) {
  const due = a.requirements?.currently_due ?? [];
  const submitted = Boolean(a.details_submitted);
  const payoutsEnabled = Boolean(a.payouts_enabled) && (a.capabilities?.transfers === undefined || a.capabilities.transfers === "active");
  const status: ConnectStatus = !submitted ? "PENDING" : payoutsEnabled && due.length === 0 ? "ACTIVE" : "RESTRICTED";
  return { status, detailsSubmitted: submitted, payoutsEnabled, requirementsDue: due.join(",") };
}

/** Versement autorisé : sans clé Stripe (mode test historique) tout reste permis ; avec clé, le compte doit être vérifié. */
export function canPayOut(status: string, connectOn: boolean) {
  return !connectOn || status === "ACTIVE";
}

async function call<T>(f: FetchLike, key: string, path: string, params: URLSearchParams, idem?: string): Promise<T> {
  const res = await f(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", ...(idem ? { "Idempotency-Key": idem } : {}) },
    body: params,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`stripe-${res.status}: ${json.error?.message ?? "erreur"}`);
  return json;
}

export const connectEnabled = () => process.env.STRIPE_CONNECT_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY);

const defaultFetch: FetchLike = (url, init) => fetch(url, init);
const secretKey = () => process.env.STRIPE_SECRET_KEY ?? "";

export async function createExpressAccount(input: { supplierId: string; email?: string | null; country?: string }, f: FetchLike = defaultFetch, key = secretKey()) {
  const p = new URLSearchParams();
  p.set("type", "express");
  p.set("capabilities[transfers][requested]", "true");
  p.set("metadata[supplierId]", input.supplierId);
  if (input.email) p.set("email", input.email);
  if (input.country) p.set("country", input.country);
  return call<StripeAccountLike & { id: string }>(f, key, "/accounts", p, `connect-account-${input.supplierId}`);
}

export async function createOnboardingLink(accountId: string, urls: { refresh: string; return: string }, f: FetchLike = defaultFetch, key = secretKey()) {
  const p = new URLSearchParams({ account: accountId, type: "account_onboarding", refresh_url: urls.refresh, return_url: urls.return });
  return call<{ url: string }>(f, key, "/account_links", p);
}

/** Transfert du net partenaire (€ en centimes) ; la clé d'idempotence évite un double transfert pour un même versement. */
export async function createTransfer(input: { payoutId: string; accountId: string; amountCents: number }, f: FetchLike = defaultFetch, key = secretKey()) {
  const p = new URLSearchParams({ amount: String(input.amountCents), currency: "eur", destination: input.accountId, transfer_group: `payout-${input.payoutId}` });
  p.set("metadata[payoutId]", input.payoutId);
  return call<{ id: string }>(f, key, "/transfers", p, `payout-${input.payoutId}`);
}
