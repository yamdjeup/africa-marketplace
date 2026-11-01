"use client";

import Link from "next/link";
import { useActionState } from "react";
import { placeOrder, type CheckoutState } from "@/app/[locale]/checkout/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatEur, getDict, type Locale } from "@/lib/i18n";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export function CheckoutForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).checkout;
  const { lines, ready, totalCents } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});

  if (!ready) return <p aria-busy="true">…</p>;

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-heading text-xl">{t.empty}</p>
        <Link href={`/${locale}/catalogue`} className={buttonVariants({ className: "mt-4" })}>
          {getDict(locale).cart.continue}
        </Link>
      </div>
    );
  }

  const cartPayload = JSON.stringify(lines.map(({ slug, size, quantity }) => ({ slug, size, quantity })));
  const fields = [
    ["email", t.email, "email", "email"],
    ["fullName", t.fullName, "text", "name"],
    ["address", t.address, "text", "street-address"],
    ["postalCode", t.postalCode, "text", "postal-code"],
    ["city", t.city, "text", "address-level2"],
    ["country", t.country, "text", "country-name"],
  ] as const;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form action={action} className="space-y-4">
        <p role="note" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">
          {t.demo}
        </p>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="cart" value={cartPayload} />
        <h2 className="font-heading text-xl">{t.contact}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([name, label, type, autoComplete]) => (
            <div key={name} className={`space-y-1 ${name === "email" || name === "address" ? "sm:col-span-2" : ""}`}>
              <label htmlFor={name} className="text-sm font-medium">
                {label}
              </label>
              <input id={name} name={name} type={type} autoComplete={autoComplete} required className={fieldClass} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t.fakeCardNote}</p>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error === "empty" ? t.empty : t.errors[state.error]}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={pending}>
          {pending ? t.submitting : t.submit}
        </Button>
      </form>

      <aside className="h-fit space-y-3 rounded-lg border p-4">
        <h2 className="font-heading text-xl">{t.summary}</h2>
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={`${l.slug}|${l.size ?? ""}`} className="flex justify-between gap-3">
              <span>
                {l.quantity} × {l.name}
                {l.size ? ` (${l.size})` : ""}
              </span>
              <span>{formatEur(l.priceCents * l.quantity, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-3 font-semibold">
          <span>{getDict(locale).cart.subtotal}</span>
          <span>{formatEur(totalCents, locale)}</span>
        </p>
      </aside>
    </div>
  );
}
