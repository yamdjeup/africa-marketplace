"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { ParcelSummary } from "@/components/marketplace/parcel-summary";
import { ApproxPrice } from "@/components/marketplace/approx-price";

export function CartView({ locale }: { locale: Locale }) {
  const t = getDict(locale).cart;
  const f9 = getDict(locale).f9;
  const { has, toggle } = useFavorites();
  const { lines, ready, totalCents, setQuantity, remove, clear } = useCart();

  if (!ready) return <p className="text-muted-foreground" aria-busy="true">…</p>;

  const backLink = (
    <Link href={`/${locale}/catalogue`} aria-label={t.back} title={t.back} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm hover:text-terracotta">
      <span aria-hidden="true" className="text-xl leading-none">←</span>
      <span className="sr-only">{t.back}</span>
    </Link>
  );

  if (lines.length === 0) {
    return (
      <div>
        {backLink}
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-heading text-xl">{t.empty}</p>
          <Link href={`/${locale}/catalogue`} className={buttonVariants({ className: "mt-4" })}>
            {t.continue}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
    {backLink}
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y rounded-lg border">
        {lines.map((l) => {
          const key = `${l.slug}|${l.size ?? ""}`;
          return (
            <li key={key} className="flex gap-3 p-3 md:gap-4 md:p-4">
              <Link href={`/${locale}/produits/${l.slug}`} className="relative block size-24 shrink-0 overflow-hidden rounded-md bg-muted md:size-28">
                <Image src={l.image} alt={l.name} fill unoptimized sizes="112px" className="object-contain p-1" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/${locale}/produits/${l.slug}`} className="font-heading text-base leading-tight">
                  {l.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {l.creatorName}
                </p>
                {l.size && <p className="text-sm font-medium">{locale === "fr" ? "Taille / variante" : "Size / variant"} : {l.size}</p>}
                <p className="text-sm font-semibold">
                  {formatEur(l.priceCents, locale)}
                  <ApproxPrice cents={l.priceCents} locale={locale} />
                </p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-md border" role="group" aria-label={t.quantity}>
                    <button
                      type="button"
                      className="size-11 text-lg"
                      aria-label={t.decrease}
                      onClick={() => setQuantity(l.slug, l.size, l.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-sm" aria-live="polite">
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      className="size-11 text-lg disabled:opacity-40"
                      aria-label={t.increase}
                      disabled={l.quantity >= l.maxQuantity}
                      onClick={() => setQuantity(l.slug, l.size, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 px-2 text-sm underline underline-offset-4 hover:text-terracotta"
                    onClick={() => remove(l.slug, l.size)}
                  >
                    {t.remove}
                    <span className="sr-only"> {l.name}</span>
                  </button>
                  <button
                    type="button"
                    className="hidden min-h-11 px-2 text-sm underline underline-offset-4 hover:text-terracotta lg:inline"
                    onClick={() => {
                      if (!has(l.slug)) toggle(l.slug);
                      remove(l.slug, l.size);
                    }}
                  >
                    {f9.moveToFavorites}
                    <span className="sr-only"> {l.name}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit space-y-4 rounded-lg border p-4 lg:sticky lg:top-40">
        <h2 className="hidden font-heading text-xl font-normal text-primary lg:block">{f9.summary}</h2>
        <p className="flex items-baseline justify-between text-lg">
          <span>{t.subtotal}</span>
          <strong className="text-right">
            {formatEur(totalCents, locale)}
            <ApproxPrice cents={totalCents} locale={locale} />
          </strong>
        </p>
        <p className="hidden justify-between border-t pt-3 text-base font-semibold lg:flex">
          <span>{f9.total}</span>
          <span>{formatEur(totalCents, locale)}</span>
        </p>
        <ParcelSummary locale={locale} />
        <Link href={`/${locale}/checkout`} className={buttonVariants({ size: "lg", className: "h-12 w-full" })}>
          {t.checkout}
        </Link>
        <Link href={`/${locale}/catalogue`} className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 w-full" })}>
          {t.continue}
        </Link>
        <Button variant="ghost" className="w-full" onClick={clear}>
          {t.clear}
        </Button>
      </aside>
    </div>
    </div>
  );
}
