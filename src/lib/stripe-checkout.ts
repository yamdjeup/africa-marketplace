import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { sendOrderEmail, sendStockRefundEmail } from "@/lib/order-email";
import { consumeHold } from "@/lib/checkout-hold";
import { refundPayment, settleSubRefund } from "@/lib/refund";
import { notifySubOrder, runSubOrderSweep } from "@/lib/order-notify";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://epomta.com").replace(/\/$/, "");
}

type CheckoutItem = { name: string; quantity: number; unitPriceCents: number };

/** Crée une session Stripe Checkout hébergée ; renvoie son URL, ou null en cas d'échec. */
export async function createCheckoutSession(order: { number: string; email: string; locale: string; editToken: string }, items: CheckoutItem[], origin: string = siteUrl(), holdMinutes = 30) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("locale", order.locale === "en" ? "en" : "fr");
  params.set("customer_email", order.email);
  params.set("client_reference_id", order.number);
  params.set("success_url", `${origin}/${order.locale}/checkout/confirmation/${order.number}?t=${order.editToken}`);
  params.set("cancel_url", `${origin}/api/checkout/cancel?n=${order.number}&t=${order.editToken}&l=${order.locale === "en" ? "en" : "fr"}`);
  params.set("expires_at", String(Math.floor(Date.now() / 1000) + Math.max(30, holdMinutes) * 60 + 30));
  params.set("metadata[orderNumber]", order.number);
  params.set("payment_intent_data[metadata][orderNumber]", order.number);
  items.forEach((it, i) => {
    params.set(`line_items[${i}][quantity]`, String(it.quantity));
    params.set(`line_items[${i}][price_data][currency]`, "eur");
    params.set(`line_items[${i}][price_data][unit_amount]`, String(it.unitPriceCents));
    params.set(`line_items[${i}][price_data][product_data][name]`, it.name);
  });
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `checkout-${order.number}`,
      },
      body: params,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string; url?: string };
    if (!json.id || !json.url) return null;
    return { id: json.id, url: json.url };
  } catch {
    return null;
  }
}

/** Vérifie l'en-tête Stripe-Signature (schéma v1, tolérance 5 min). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const v1 = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || v1.length === 0 || Math.abs(now / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return v1.some((sig) => {
    const buf = Buffer.from(sig, "hex");
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  });
}

/** Confirme une commande payée : enregistre le paiement, puis envoie les notifications différées. */
/** Paiement réussi : crée la commande depuis la réservation (idempotent), puis e-mails ; remboursement automatique si le stock a disparu. */
export async function confirmPaidOrder(number: string, paymentIntentId: string | null, amountCents?: number) {
  const r = await consumeHold(db, number, paymentIntentId);
  if (r.status === "unknown") return confirmLegacyOrder(number, paymentIntentId);
  if (r.status === "already") return false;
  if (r.status === "nostock") {
    const total = amountCents ?? r.payload.totalCents;
    await refundPayment({ paymentIntentId, amountCents: total, number });
    await sendStockRefundEmail({ to: r.payload.email, locale: r.payload.locale === "en" ? "en" : "fr", fullName: r.payload.fullName, item: r.item, amountCents: total, number });
    return false;
  }
  return announceOrder(number);
}

/** Anciennes commandes créées avant paiement (paymentPending) : conservé pour les données existantes. */
async function confirmLegacyOrder(number: string, paymentIntentId: string | null) {
  const claimed = await db.order.updateMany({
    where: { number, paymentPending: true },
    data: { paymentPending: false, stripePaymentIntentId: paymentIntentId },
  });
  if (claimed.count === 0) return false;
  // Colis refusés/annulés avant la confirmation du paiement : remboursement de rattrapage.
  const closed = await db.subOrder.findMany({ where: { order: { number }, status: { in: ["CANCELLED", "REFUSED", "EXPIRED"] }, refundStatus: { not: "DONE" } }, select: { id: true } });
  for (const s of closed) await settleSubRefund(s.id);
  return announceOrder(number);
}

async function announceOrder(number: string) {
  const order = await db.order.findUnique({ where: { number }, include: { items: true, subOrders: { select: { id: true } } } });
  if (!order) return false;
  const products = await db.product.findMany({ where: { slug: { in: order.items.map((i) => i.productSlug) } }, select: { slug: true, images: true } });
  const imageOf = new Map(products.map((p) => [p.slug, Array.isArray(p.images) ? (p.images as string[])[0] : undefined]));
  const locale = order.locale === "en" ? "en" : "fr";
  after(async () => {
    for (const s of order.subOrders) await notifySubOrder("NEW", s.id);
    await runSubOrderSweep().catch(() => undefined);
  });
  await sendOrderEmail({
    to: order.email,
    locale,
    number,
    fullName: order.fullName,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, size: i.size, unitPriceCents: i.unitPriceCents, image: imageOf.get(i.productSlug) })),
    totalCents: order.totalCents,
    shipping: {
      lines: [order.fullName, order.address, `${order.postalCode} ${order.city}`.trim(), order.country],
      phone: order.phone,
      editUrl: `${siteUrl()}/${locale}/checkout/confirmation/${number}/address?t=${order.editToken}`,
    },
  });
  return true;
}
