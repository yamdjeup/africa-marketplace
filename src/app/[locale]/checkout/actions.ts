"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { runAlerts } from "@/lib/alerts";
import { auth } from "@/auth";
import { checkAddress, formatStreet, readAddress } from "@/lib/address";
import { db } from "@/lib/db";
import { returnOrigin } from "@/lib/origin";
import { isLocale } from "@/lib/i18n";
import { sendOrderEmail } from "@/lib/order-email";
import { isAddressEditable, isOrderOwner } from "@/lib/order-edit";
import { notifySubOrder, runSubOrderSweep } from "@/lib/order-notify";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe-checkout";
import { recordWatch } from "@/lib/restock-watch";
import { attachSession, buyerKeyOf, consumeHold, createHold, releaseBuyerHolds, releaseHold, StockError, stockReason, type HoldPayload } from "@/lib/checkout-hold";
import { notifyLowStock, snapshotAvail } from "@/lib/stock-alerts";

export type CheckoutState = { error?: "required" | "email" | "postal" | "stock" | "reserved" | "unknown" | "empty"; item?: string; values?: Record<string, string> };

type CartInput = { slug: string; size: string | null; quantity: number }[];

function parseCart(raw: FormDataEntryValue | null): CartInput {
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.slug === "string" && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99)
      .map((l) => ({ slug: l.slug, size: typeof l.size === "string" ? l.size : null, quantity: l.quantity }));
  } catch {
    return [];
  }
}

export async function updateOrderAddress(formData: FormData) {
  const locale = String(formData.get("locale") ?? "fr");
  if (!isLocale(locale)) redirect("/fr");
  const field = (name: string) => String(formData.get(name) ?? "").trim().slice(0, 200);
  const number = field("number");
  const token = field("t");
  const order = await db.order.findUnique({ where: { number } });
  const session = await auth();
  const base = `/${locale}/checkout/confirmation/${number}`;
  const tq = token ? `t=${encodeURIComponent(token)}` : "";
  if (!order || !isOrderOwner(order, token, session?.user?.id) || !isAddressEditable(order.createdAt)) redirect(`${base}${tq ? `?${tq}` : ""}`);
  const addr = readAddress(field);
  const problem = checkAddress(addr);
  if (problem) redirect(`${base}/address?${[tq, `error=${problem}`].filter(Boolean).join("&")}`);
  await db.order.update({
    where: { number },
    data: {
      fullName: `${addr.firstName} ${addr.lastName}`,
      address: formatStreet(addr, order.locale === "en" ? "en" : "fr"),
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country,
      phone: addr.phone,
      street: addr.line1,
      houseNumber: addr.houseNumber,
      box: addr.box || null,
      complement: addr.line2 || null,
    },
  });
  redirect(`${base}?${[tq, "updated=1"].filter(Boolean).join("&")}`);
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const locale = String(formData.get("locale") ?? "fr");
  if (!isLocale(locale)) return { error: "unknown" };

  const field = (name: string) => String(formData.get(name) ?? "").trim().slice(0, 200);
  const email = field("email");
  const addr = readAddress(field);
  const values = { email, ...addr };
  const fail = (error: NonNullable<CheckoutState["error"]>, item?: string): CheckoutState => ({ error, item, values });
  if (!email) return fail("required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("email");
  const problem = checkAddress(addr);
  if (problem) return fail(problem);
  const fullName = `${addr.firstName} ${addr.lastName}`;
  const address = formatStreet(addr, locale);

  const cart = parseCart(formData.get("cart"));
  if (cart.length === 0) return fail("empty");

  const session = await auth();
  const user = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id } }) : null;
  // Retour arrière depuis Stripe puis reconfirmation : la réservation précédente du même acheteur est libérée avant de vérifier le stock.
  await releaseBuyerHolds(db, buyerKeyOf(null, email));
  if (user) await releaseBuyerHolds(db, buyerKeyOf(user.id, email));
  const products = await db.product.findMany({ where: { slug: { in: cart.map((l) => l.slug) }, status: "PUBLISHED", supplierId: { not: null } }, include: { variants: true } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  let totalCents = 0;
  const stockUsed = new Map<string, number>();
  for (const line of cart) {
    const p = bySlug.get(line.slug);
    if (!p) return fail("unknown");
    const variant = p.variants.find((v) => v.label === line.size);
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    if (p.variants.length > 0 ? !variant : sizes.length > 0 ? !line.size || !sizes.includes(line.size) : line.size !== null) return fail("unknown");
    const key = `${p.slug}\u0000${line.size ?? ""}`;
    const used = (stockUsed.get(key) ?? 0) + line.quantity;
    if (used > (variant ? variant.stock - variant.reserved : p.stock - p.reserved)) {
      await recordWatch(db, { buyerKey: buyerKeyOf(user?.id ?? null, email), email, locale, slugs: [p.slug], source: "BLOCKED" }).catch(() => undefined);
      return fail(stockReason({ stock: variant ? variant.stock : p.stock, reserved: variant ? variant.reserved : p.reserved }, used) === "reserved" ? "reserved" : "stock", p.name);
    }
    stockUsed.set(key, used);
    totalCents += p.priceCents * line.quantity;
  }

  const number = `AM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const editToken = randomUUID();
  const before = await snapshotAvail(products.map((p) => p.slug));
  const payload: HoldPayload = {
    locale,
    email,
    userId: user?.id ?? null,
    fullName,
    address,
    postalCode: addr.postalCode,
    city: addr.city,
    country: addr.country,
    phone: addr.phone,
    street: addr.line1,
    houseNumber: addr.houseNumber,
    box: addr.box || null,
    complement: addr.line2 || null,
    editToken,
    totalCents,
    lines: cart.map((l) => {
      const p = bySlug.get(l.slug)!;
      return { slug: p.slug, name: p.name, size: l.size, quantity: l.quantity, unitPriceCents: p.priceCents, supplierId: p.supplierId };
    }),
  };
  // Réservation de 30 min : aucune commande ni e-mail avant le paiement.
  try {
    await createHold(db, payload, number);
  } catch (e) {
    if (e instanceof StockError) {
      await recordWatch(db, { buyerKey: buyerKeyOf(user?.id ?? null, email), email, locale, slugs: payload.lines.map((l) => l.slug), source: "BLOCKED" }).catch(() => undefined);
      return fail("reserved", e.item);
    }
    throw e;
  }
  after(() => notifyLowStock(before).catch(() => undefined));

  const hdr = await headers();
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://epomta.com").replace(/\/$/, "");
  const origin = returnOrigin(hdr.get("x-forwarded-host") ?? hdr.get("host"), configured);
  if (stripeEnabled()) {
    const stripeSession = await createCheckoutSession(
      { number, email, locale, editToken },
      payload.lines.map((l) => ({ name: l.size ? `${l.name} (${l.size})` : l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents })),
      origin,
    );
    if (stripeSession) {
      await attachSession(db, number, stripeSession.id);
      redirect(stripeSession.url);
    }
    // Échec de création de session : la réservation est libérée, puis retour au comportement sans paiement en ligne.
    await releaseHold(db, number, "Session de paiement non créée");
    try {
      await createHold(db, payload, number);
    } catch (e) {
      if (e instanceof StockError) return fail("stock", e.item);
      throw e;
    }
  }
  const made = await consumeHold(db, number, null);
  if (made.status !== "created") return fail("unknown");
  after(async () => {
    for (const id of made.subIds) await notifySubOrder("NEW", id);
    await runSubOrderSweep().catch(() => undefined);
  });

  await sendOrderEmail({
    to: email,
    locale,
    number,
    fullName,
    items: payload.lines.map((l) => {
      const p = bySlug.get(l.slug)!;
      return { name: l.name, quantity: l.quantity, size: l.size, unitPriceCents: l.unitPriceCents, image: Array.isArray(p.images) ? (p.images as string[])[0] : undefined };
    }),
    totalCents,
    shipping: {
      lines: [fullName, address, `${addr.postalCode} ${addr.city}`.trim(), addr.country],
      phone: addr.phone,
      editUrl: `${origin}/${locale}/checkout/confirmation/${number}/address?t=${editToken}`,
    },
  });

  // Pièce vendue (dernière pièce / rupture) : avis aux abonnés, après la réponse pour ne pas ralentir la commande.
  after(() => runAlerts(20).catch(() => undefined));

  redirect(`/${locale}/checkout/confirmation/${number}?t=${editToken}`);
}