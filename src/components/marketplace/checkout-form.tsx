"use client";

import Link from "next/link";
import { formatPhone } from "@/lib/phone";
import { useActionState, useRef, useState } from "react";
import { placeOrder, type CheckoutState } from "@/app/[locale]/checkout/actions";
import { ParcelSummary } from "@/components/marketplace/parcel-summary";
import { AddressFields } from "@/components/marketplace/address-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { EMPTY_ADDRESS, formatStreet, readAddress, type AddressFieldValues } from "@/lib/address";
import { useCart } from "@/lib/cart";
import { formatEur, getDict, type Locale } from "@/lib/i18n";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export type CheckoutAddress = AddressFieldValues & { id: string; isDefault: boolean };

type Review = { email: string; address: AddressFieldValues; mismatch: boolean };

export function CheckoutForm({
  locale,
  user,
  addresses = [],
}: {
  locale: Locale;
  user: { name: string; email: string } | null;
  addresses?: CheckoutAddress[];
}) {
  const t = getDict(locale).checkout;
  const m = getDict(locale).me;
  const { lines, ready, totalCents } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [picked, setPicked] = useState<string | null>(null);
  const [manual, setManual] = useState<AddressFieldValues>(EMPTY_ADDRESS);
  const [review, setReview] = useState<Review | null>(null);
  const [checking, setChecking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const selected = addresses.find((a) => a.id === picked) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
  const checkoutPath = `/${locale}/checkout`;
  const newHref = `/${locale}/account/addresses/new?next=${encodeURIComponent(checkoutPath)}`;

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

  async function verify() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const data = new FormData(form);
    const address = readAddress((n) => String(data.get(n) ?? "").trim());
    setChecking(true);
    let mismatch = false;
    try {
      const qs = new URLSearchParams({ postalCode: address.postalCode, city: address.city, country: address.country, locale });
      const res = await fetch(`/api/address/check?${qs}`);
      mismatch = ((await res.json()) as { status?: string }).status === "mismatch";
    } catch {
      mismatch = false;
    }
    setChecking(false);
    setReview({ email: String(data.get("email") ?? ""), address, mismatch });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cartPayload = JSON.stringify(lines.map(({ slug, size, quantity }) => ({ slug, size, quantity })));
  const defaultEmail = state.values?.email ?? user?.email;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form ref={formRef} action={action} className="space-y-4">
        <p role="note" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">
          {t.demo}
        </p>
        <p role="note" className="rounded-md border bg-muted p-3 text-sm font-medium">
          {t.shippingBanner}
        </p>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="cart" value={cartPayload} />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error === "empty" ? t.empty : t.errors[state.error]}
            {state.error === "stock" && state.item ? ` (${state.item})` : ""}
          </p>
        )}

        {review && (
          <section aria-labelledby="review-title" className="space-y-4 rounded-lg border p-4">
            <h2 id="review-title" className="font-heading text-xl">
              {t.review.title}
            </h2>
            <p className="text-sm text-muted-foreground">{t.review.intro}</p>
            <address className="not-italic leading-relaxed">
              <strong>
                {review.address.firstName} {review.address.lastName}
              </strong>
              <br />
              {formatStreet(review.address, locale)}
              <br />
              {review.address.postalCode} {review.address.city}
              <br />
              {review.address.country}
              <br />
              {getDict(locale).confirmation.phone} : {formatPhone(review.address.phone)}
              <br />
              {review.email}
            </address>
            <p className="text-xs text-muted-foreground">{t.review.phoneNote}</p>
            {review.mismatch && (
              <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
                {t.review.mismatch}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => setReview(null)}>
                {t.review.edit}
              </Button>
              <Button type="submit" size="lg" className="h-12" disabled={pending}>
                {pending ? t.submitting : t.review.confirm}
              </Button>
            </div>
          </section>
        )}

        <div hidden={Boolean(review)} className="space-y-4">
          {!user && (
            <p className="text-sm text-muted-foreground">
              {getDict(locale).account.guestNote}{" "}
              <Link href={`/${locale}/login?next=${encodeURIComponent(checkoutPath)}`} className="text-primary underline underline-offset-4">
                {getDict(locale).account.login}
              </Link>
            </p>
          )}
          <h2 className="font-heading text-xl">{t.contact}</h2>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              {t.email}
            </label>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required className={fieldClass} />
          </div>

          {selected ? (
            <fieldset className="space-y-2">
              <legend className="font-heading text-xl">{m.selectAddress}</legend>
              {(Object.keys(EMPTY_ADDRESS) as (keyof AddressFieldValues)[]).map((k) => (
                <input key={k} type="hidden" name={k} value={selected[k]} />
              ))}
              <ul className="divide-y rounded-lg border">
                {addresses.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 p-3 text-sm">
                    <input
                      type="radio"
                      id={`addr-${a.id}`}
                      name="addressChoice"
                      checked={a.id === selected.id}
                      onChange={() => setPicked(a.id)}
                      className="mt-1 size-5 accent-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor={`addr-${a.id}`} className="block cursor-pointer leading-relaxed">
                        <strong>
                          {a.firstName} {a.lastName}
                        </strong>
                        <br />
                        {formatStreet(a, locale)}
                        <br />
                        {a.postalCode} {a.city}, {a.country}
                        <br />
                        {a.phone}
                      </label>
                      <Link
                        href={`/${locale}/account/addresses/${a.id}?next=${encodeURIComponent(checkoutPath)}`}
                        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-terracotta"
                      >
                        {m.edit}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : (
            <>
              <h2 className="font-heading text-xl">{m.shipTo}</h2>
              <AddressFields locale={locale} values={manual} onChange={(p) => setManual((v) => ({ ...v, ...p }))} />
            </>
          )}
          {user && (
            <Link href={newHref} className="flex min-h-11 items-center gap-2 text-sm font-medium hover:text-terracotta">
              <span aria-hidden="true" className="text-xl leading-none">+</span>
              {m.addAddress}
            </Link>
          )}
          <Button type="button" size="lg" className="h-12 w-full sm:w-auto" disabled={checking} onClick={verify}>
            {checking ? t.review.checking : t.verify}
          </Button>
        </div>
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
        <ParcelSummary locale={locale} />
      </aside>
    </div>
  );
}
