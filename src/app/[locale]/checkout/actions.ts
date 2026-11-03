"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { checkAddress, formatStreet, readAddress } from "@/lib/address";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { sendOrderEmail } from "@/lib/order-email";
import { isAddressEditable, isOrderOwner } from "@/lib/order-edit";

export type CheckoutState = { error?: "required" | "email" | "postal" | "stock" | "unknown" | "empty"; values?: Record<string, string> };

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
  const fail = (error: NonNullable<CheckoutState["error"]>): CheckoutState => ({ error, values });
  if (!email) return fail("required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("email");
  const problem = checkAddress(addr);
  if (problem) return fail(problem);
  const fullName = `${addr.firstName} ${addr.lastName}`;
  const address = formatStreet(addr, locale);

  const cart = parseCart(formData.get("cart"));
  if (cart.length === 0) return fail("empty");

  const products = await db.product.findMany({ where: { slug: { in: cart.map((l) => l.slug) } } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  let totalCents = 0;
  const stockUsed = new Map<string, number>();
  for (const line of cart) {
    const p = bySlug.get(line.slug);
    if (!p) return fail("unknown");
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    if (sizes.length > 0 ? !line.size || !sizes.includes(line.size) : line.size !== null) return fail("unknown");
    const used = (stockUsed.get(p.slug) ?? 0) + line.quantity;
    if (used > p.stock) return fail("stock");
    stockUsed.set(p.slug, used);
    totalCents += p.priceCents * line.quantity;
  }

  const number = `AM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const session = await auth();
  const user = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id } }) : null;
  const editToken = randomUUID();
  await db.$transaction([
    db.order.create({
      data: {
        number,
        locale,
        userId: user?.id ?? null,
        email,
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
        items: {
          create: cart.map((l) => {
            const p = bySlug.get(l.slug)!;
            return {
              productSlug: p.slug,
              name: p.name,
              size: l.size,
              quantity: l.quantity,
              unitPriceCents: p.priceCents,
            };
          }),
        },
      },
    }),
    ...[...stockUsed].map(([slug, qty]) =>
      db.product.update({ where: { slug }, data: { stock: { decrement: qty } } }),
    ),
  ]);

  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "https://epomta-demo.vercel.app").replace(/\/$/, "");
  await sendOrderEmail({
    to: email,
    locale,
    number,
    fullName,
    items: cart.map((l) => {
      const p = bySlug.get(l.slug)!;
      return { name: p.name, quantity: l.quantity, unitPriceCents: p.priceCents };
    }),
    totalCents,
    shipping: {
      lines: [fullName, address, `${addr.postalCode} ${addr.city}`.trim(), addr.country],
      phone: addr.phone,
      editUrl: `${base}/${locale}/checkout/confirmation/${number}/address?t=${editToken}`,
    },
  });

  redirect(`/${locale}/checkout/confirmation/${number}?t=${editToken}`);
}
