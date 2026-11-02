"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { sendOrderEmail } from "@/lib/order-email";

export type CheckoutState = { error?: "required" | "email" | "stock" | "unknown" | "empty"; values?: Record<string, string> };

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

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const locale = String(formData.get("locale") ?? "fr");
  if (!isLocale(locale)) return { error: "unknown" };

  const field = (name: string) => String(formData.get(name) ?? "").trim().slice(0, 200);
  const values = {
    email: field("email"),
    fullName: field("fullName"),
    address: field("address"),
    postalCode: field("postalCode"),
    city: field("city"),
    country: field("country"),
  };
  const fail = (error: NonNullable<CheckoutState["error"]>): CheckoutState => ({ error, values });
  if (Object.values(values).some((v) => !v)) return fail("required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return fail("email");

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
  await db.$transaction([
    db.order.create({
      data: {
        number,
        locale,
        userId: user?.id ?? null,
        ...values,
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

  await sendOrderEmail({
    to: values.email,
    locale,
    number,
    fullName: values.fullName,
    items: cart.map((l) => {
      const p = bySlug.get(l.slug)!;
      return { name: p.name, quantity: l.quantity, unitPriceCents: p.priceCents };
    }),
    totalCents,
  });

  redirect(`/${locale}/checkout/confirmation/${number}`);
}
