import { randomUUID } from "node:crypto";
import { checkAddress, formatStreet, readAddress } from "@/lib/address";
import { buyerKeyOf, createHold, releaseBuyerHolds, releaseHold, attachSession, StockError, stockReason, type HoldPayload } from "@/lib/checkout-hold";
import { db } from "@/lib/db";
import { confirmPaidOrder, stripeEnabled } from "@/lib/stripe-checkout";

type MobileUser = { id: string; email: string };
export type CartInput = { slug: string; size: string | null; quantity: number }[];
export type CreateResult =
  | { number: string; paymentIntentId: string; clientSecret: string; totalCents: number }
  | { error: "disabled" | "empty" | "address" | "unknown" | "stock" | "reserved" | "payment"; item?: string };

export function parseCart(raw: unknown): CartInput {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && typeof l.slug === "string" && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99)
    .map((l) => ({ slug: l.slug as string, size: typeof l.size === "string" ? l.size : null, quantity: l.quantity as number }));
}

const stripeFetch = (path: string, init: RequestInit) =>
  fetch(`https://api.stripe.com/v1/${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(init.headers ?? {}) } });

/** Même contrôles que placeOrder du site (adresse, variantes, stock), réservation de 30 min, puis PaymentIntent pour la PaymentSheet native. */
export async function createMobilePayment(user: MobileUser, addressId: string, cartRaw: unknown): Promise<CreateResult> {
  if (!stripeEnabled()) return { error: "disabled" };
  const cart = parseCart(cartRaw);
  if (cart.length === 0) return { error: "empty" };
  const a = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!a) return { error: "address" };
  const addr = readAddress((n) => String(({ firstName: a.firstName, lastName: a.lastName, country: a.country, line1: a.line1, houseNumber: a.houseNumber, box: a.box ?? "", line2: a.line2 ?? "", postalCode: a.postalCode, city: a.city, phone: a.phone } as Record<string, string>)[n] ?? ""));
  if (checkAddress(addr)) return { error: "address" };

  const buyerKey = buyerKeyOf(user.id, user.email);
  await releaseBuyerHolds(db, buyerKey);
  const products = await db.product.findMany({ where: { slug: { in: cart.map((l) => l.slug) }, status: "PUBLISHED", supplierId: { not: null } }, include: { variants: true } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  let totalCents = 0;
  const used = new Map<string, number>();
  for (const line of cart) {
    const p = bySlug.get(line.slug);
    if (!p) return { error: "unknown" };
    const variant = p.variants.find((v) => v.label === line.size);
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    if (p.variants.length > 0 ? !variant : sizes.length > 0 ? !line.size || !sizes.includes(line.size) : line.size !== null) return { error: "unknown" };
    const key = `${p.slug}\u0000${line.size ?? ""}`;
    const n = (used.get(key) ?? 0) + line.quantity;
    const src = variant ?? p;
    if (n > src.stock - src.reserved) return { error: stockReason({ stock: src.stock, reserved: src.reserved }, n) === "reserved" ? "reserved" : "stock", item: p.name };
    used.set(key, n);
    totalCents += p.priceCents * line.quantity;
  }

  const number = `AM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const payload: HoldPayload = {
    locale: "fr",
    email: user.email,
    userId: user.id,
    fullName: `${addr.firstName} ${addr.lastName}`,
    address: formatStreet(addr, "fr"),
    postalCode: addr.postalCode,
    city: addr.city,
    country: addr.country,
    phone: addr.phone,
    street: addr.line1,
    houseNumber: addr.houseNumber,
    box: addr.box || null,
    complement: addr.line2 || null,
    editToken: randomUUID(),
    totalCents,
    lines: cart.map((l) => {
      const p = bySlug.get(l.slug)!;
      return { slug: p.slug, name: p.name, size: l.size, quantity: l.quantity, unitPriceCents: p.priceCents, supplierId: p.supplierId };
    }),
  };
  try {
    await createHold(db, payload, number);
  } catch (e) {
    if (e instanceof StockError) return { error: "reserved", item: e.item };
    throw e;
  }

  const params = new URLSearchParams({ amount: String(totalCents), currency: "eur", "automatic_payment_methods[enabled]": "true", receipt_email: user.email, "metadata[orderNumber]": number, "metadata[source]": "mobile" });
  const res = await stripeFetch("payment_intents", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `mobile-pi-${number}` }, body: params }).catch(() => null);
  const pi = res && res.ok ? ((await res.json().catch(() => null)) as { id?: string; client_secret?: string } | null) : null;
  if (!pi?.id || !pi.client_secret) {
    await releaseHold(db, number, "PaymentIntent non créé");
    return { error: "payment" };
  }
  await attachSession(db, number, pi.id);
  return { number, paymentIntentId: pi.id, clientSecret: pi.client_secret, totalCents };
}

/** Vérifie auprès de Stripe que le paiement est réussi, puis crée la commande depuis la réservation (idempotent, comme le webhook). */
export async function confirmMobilePayment(user: MobileUser, number: string): Promise<{ status: "paid" | "pending" | "failed" | "unknown" }> {
  const order = await db.order.findUnique({ where: { number }, select: { userId: true } });
  if (order) return order.userId === user.id ? { status: "paid" } : { status: "unknown" };
  const hold = await db.checkoutHold.findUnique({ where: { number } });
  if (!hold || (hold.payload as unknown as HoldPayload).userId !== user.id || !hold.stripeSessionId) return { status: "unknown" };
  const res = await stripeFetch(`payment_intents/${encodeURIComponent(hold.stripeSessionId)}`, { method: "GET" }).catch(() => null);
  const pi = res && res.ok ? ((await res.json().catch(() => null)) as { id?: string; status?: string; amount_received?: number; metadata?: { orderNumber?: string } } | null) : null;
  if (!pi || pi.metadata?.orderNumber !== number) return { status: "unknown" };
  if (pi.status === "succeeded") {
    await confirmPaidOrder(number, pi.id ?? null, pi.amount_received);
    const made = await db.order.findUnique({ where: { number }, select: { id: true } });
    return { status: made ? "paid" : "failed" };
  }
  return { status: pi.status === "canceled" || pi.status === "requires_payment_method" ? "failed" : "pending" };
}

export async function cancelMobilePayment(user: MobileUser, number: string) {
  const hold = await db.checkoutHold.findUnique({ where: { number } });
  if (!hold || (hold.payload as unknown as HoldPayload).userId !== user.id) return false;
  await releaseHold(db, number, "Paiement annulé dans l'application");
  return true;
}

export async function listOrders(userId: string) {
  const rows = await db.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: true, subOrders: { select: { number: true, status: true, carrier: true, trackingNumber: true, shippedAt: true, deliveredAt: true } } } });
  return rows.map((o) => ({
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    totalCents: o.totalCents,
    address: { fullName: o.fullName, street: o.address, postalCode: o.postalCode, city: o.city, country: o.country },
    items: o.items.map((i) => ({ slug: i.productSlug, name: i.name, size: i.size, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
    parcels: o.subOrders,
  }));
}
