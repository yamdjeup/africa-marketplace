import { randomUUID } from "node:crypto";
import { isAddressEditable } from "@/lib/order-edit";
import { checkAddress, formatStreet, readAddress } from "@/lib/address";
import { buyerKeyOf, createHold, releaseBuyerHolds, releaseHold, attachSession, StockError, stockReason, type HoldPayload } from "@/lib/checkout-hold";
import { db } from "@/lib/db";
import { RETURN_LABELS, returnEligibility, showShippedNotice, type ReturnStatus } from "@/lib/returns";
import { subLabel } from "@/lib/suborders";
import { carrierLabel, cleanTrackingNumber, trackingUrl } from "@/lib/tracking";
import { saveAddress } from "@/lib/mobile-account";
import { confirmPaidOrder, stripeEnabled } from "@/lib/stripe-checkout";

type MobileUser = { id: string; email: string };
export type CartInput = { slug: string; size: string | null; quantity: number }[];
export type CreateResult =
  | { number: string; paymentIntentId: string; clientSecret: string; totalCents: number; guestToken?: string }
  | { error: "disabled" | "empty" | "address" | "postal" | "email" | "unknown" | "stock" | "reserved" | "payment"; item?: string };
export type PayInput = { addressId?: unknown; address?: Record<string, unknown>; email?: unknown; save?: unknown };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCart(raw: unknown): CartInput {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l && typeof l.slug === "string" && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99)
    .map((l) => ({ slug: l.slug as string, size: typeof l.size === "string" ? l.size : null, quantity: l.quantity as number }));
}

const stripeFetch = (path: string, init: RequestInit) =>
  fetch(`https://api.stripe.com/v1/${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(init.headers ?? {}) } });

/** Même contrôles que placeOrder du site (adresse, variantes, stock), réservation de 30 min, puis PaymentIntent pour la PaymentSheet native. */
export async function createMobilePayment(userIn: MobileUser | null, input: PayInput, cartRaw: unknown): Promise<CreateResult> {
  if (!stripeEnabled()) return { error: "disabled" };
  const cart = parseCart(cartRaw);
  if (cart.length === 0) return { error: "empty" };
  const field = (b: Record<string, unknown>) => (n: string) => (typeof b[n] === "string" ? (b[n] as string).trim().slice(0, 200) : "");
  const email = userIn ? userIn.email : field(input as Record<string, unknown>)("email");
  if (!EMAIL_RE.test(email)) return { error: "email" };
  const user = userIn;
  let addr;
  if (input.addressId && user) {
    const a = await db.address.findFirst({ where: { id: String(input.addressId), userId: user.id } });
    if (!a) return { error: "address" };
    addr = readAddress((n) => String(({ firstName: a.firstName, lastName: a.lastName, country: a.country, line1: a.line1, houseNumber: a.houseNumber, box: a.box ?? "", line2: a.line2 ?? "", postalCode: a.postalCode, city: a.city, phone: a.phone } as Record<string, string>)[n] ?? ""));
  } else {
    addr = readAddress(field(input.address ?? {}));
  }
  const problem = checkAddress(addr);
  if (problem) return { error: problem === "postal" ? "postal" : "address" };
  if (user && !input.addressId && input.save === true) await saveAddress(user.id, input.address ?? {}).catch(() => undefined);

  const buyerKey = buyerKeyOf(user?.id ?? null, email);
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
    email,
    userId: user?.id ?? null,
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

  const params = new URLSearchParams({ amount: String(totalCents), currency: "eur", "automatic_payment_methods[enabled]": "true", receipt_email: email, "metadata[orderNumber]": number, "metadata[source]": "mobile" });
  const res = await stripeFetch("payment_intents", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `mobile-pi-${number}` }, body: params }).catch(() => null);
  const pi = res && res.ok ? ((await res.json().catch(() => null)) as { id?: string; client_secret?: string } | null) : null;
  if (!pi?.id || !pi.client_secret) {
    await releaseHold(db, number, "PaymentIntent non créé");
    return { error: "payment" };
  }
  await attachSession(db, number, pi.id);
  return { number, paymentIntentId: pi.id, clientSecret: pi.client_secret, totalCents, guestToken: user ? undefined : payload.editToken };
}

/** Invité : la preuve est le jeton renvoyé à la création (editToken de la réservation) ; connecté : le jeton Bearer. */
function owns(user: MobileUser | null, guestToken: string, p: HoldPayload) {
  return user ? p.userId === user.id : !p.userId && !!guestToken && p.editToken === guestToken;
}

/** Vérifie auprès de Stripe que le paiement est réussi, puis crée la commande depuis la réservation (idempotent, comme le webhook). */
export async function confirmMobilePayment(user: MobileUser | null, number: string, guestToken = ""): Promise<{ status: "paid" | "pending" | "failed" | "unknown" }> {
  const order = await db.order.findUnique({ where: { number }, select: { userId: true, editToken: true } });
  if (order) return (user ? order.userId === user.id : !order.userId && !!guestToken && order.editToken === guestToken) ? { status: "paid" } : { status: "unknown" };
  const hold = await db.checkoutHold.findUnique({ where: { number } });
  if (!hold || !owns(user, guestToken, hold.payload as unknown as HoldPayload) || !hold.stripeSessionId) return { status: "unknown" };
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

export async function cancelMobilePayment(user: MobileUser | null, number: string, guestToken = "") {
  const hold = await db.checkoutHold.findUnique({ where: { number } });
  if (!hold || !owns(user, guestToken, hold.payload as unknown as HoldPayload)) return false;
  await releaseHold(db, number, "Paiement annulé dans l'application");
  return true;
}

// Colis détaillés comme SubOrderTracking du site (components/marketplace/sub-order-tracking.tsx) : boutique, articles, état, suivi, remboursement, annulation, retour.
export async function listOrders(userId: string) {
  const rows = await db.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: true, subOrders: { orderBy: { createdAt: "asc" } } } });
  const subs = rows.flatMap((o) => o.subOrders);
  const shops = await db.supplier.findMany({ where: { id: { in: subs.map((s) => s.supplierId) } }, select: { id: true, displayName: true, country: true } });
  const returns = await db.returnRequest.findMany({ where: { subOrderId: { in: subs.map((s) => s.id) } } });
  return rows.map((o) => ({
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    totalCents: o.totalCents,
    address: { fullName: o.fullName, street: o.address, postalCode: o.postalCode, city: o.city, country: o.country, line1: o.street || o.address, houseNumber: o.houseNumber, box: o.box ?? "", line2: o.complement ?? "", phone: o.phone },
    canEditAddress: isAddressEditable(o.createdAt) && !o.subOrders.some((s) => ["CANCELLED", "REFUSED", "EXPIRED", "SHIPPED", "DELIVERED"].includes(s.status)),
    items: o.items.map((i) => ({ slug: i.productSlug, name: i.name, size: i.size, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
    parcels: o.subOrders.map((s) => {
      const shop = shops.find((x) => x.id === s.supplierId);
      const ret = returns.find((r) => r.subOrderId === s.id);
      const retLabel = ret ? RETURN_LABELS[ret.status as ReturnStatus]?.fr ?? ret.status : null;
      return {
        id: s.id,
        number: s.number,
        status: s.status,
        statusLabel: subLabel(s.status).fr,
        shop: shop ? { name: shop.displayName, country: shop.country } : null,
        items: o.items.filter((i) => i.subOrderId === s.id).map((i) => ({ slug: i.productSlug, name: i.name, size: i.size, quantity: i.quantity })),
        carrier: s.carrier ? carrierLabel(s.carrier, true) : "",
        trackingNumber: s.trackingNumber ? cleanTrackingNumber(s.trackingNumber) : "",
        trackingUrl: s.trackingNumber ? trackingUrl(s.carrier, s.trackingNumber) : null,
        shippedAt: s.shippedAt?.toISOString() ?? null,
        deliveredAt: s.deliveredAt?.toISOString() ?? null,
        reason: ["REFUSED", "CANCELLED"].includes(s.status) ? s.reason : null,
        subtotalCents: s.subtotalCents,
        refundStatus: s.refundStatus,
        canCancel: ["PENDING", "ACCEPTED", "PREPARING"].includes(s.status),
        returnStatus: retLabel,
        canReturn: !ret && returnEligibility(s, false) === "ok",
        shippedNotice: showShippedNotice(s.status, !!ret),
      };
    }),
  }));
}
