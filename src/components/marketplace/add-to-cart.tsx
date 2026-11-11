"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { getDict, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  slug: string;
  name: string;
  creatorName: string;
  image: string;
  priceCents: number;
  stock: number;
  sizes?: string[];
  /** Stock disponible par variante (taille/couleur) ; absent si l'œuvre n'a pas de variantes. */
  sizeStock?: Record<string, number>;
  sizeLabel?: string;
  /** Pièce unique : pas de sélecteur de quantité. */
  unique?: boolean;
};

export function AddToCart({ locale, slug, name, creatorName, image, priceCents, stock, sizes = [], sizeStock, sizeLabel, unique }: Props) {
  const t = getDict(locale).product;
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const disabled = stock === 0 || added;
  const [qty, setQty] = useState(1);
  const fr = locale === "fr";
  const cap = sizeStock && size ? sizeStock[size] ?? stock : stock;
  const maxQty = Math.max(1, cap);
  const q = Math.min(qty, maxQty);
  const LOW = 3;
  const lowN = (n: number) => (fr ? `Plus que ${n}` : n === 1 ? "Only 1 left" : `Only ${n} left`);
  const showQty = stock > 1 && !unique;

  return (
    <div className="space-y-4">
      {sizes.length > 0 && stock > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{sizeLabel ?? t.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const out = sizeStock ? (sizeStock[s] ?? 0) <= 0 : false;
              return (
              <label
                key={s}
                className={`flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm has-[:focus-visible]:ring-2 ${out ? "cursor-not-allowed text-muted-foreground line-through opacity-60" : "cursor-pointer"} ${
                  size === s ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                }`}
              >
                <input
                  type="radio"
                  name={`size-${slug}`}
                  value={s}
                  checked={size === s}
                  disabled={out}
                  onChange={() => {
                    setSize(s);
                    setAdded(false);
                    setMissing(false);
                  }}
                  className="sr-only"
                />
                {s}
                {!out && sizeStock && (sizeStock[s] ?? 0) <= LOW && <span className={`ml-2 text-xs font-medium ${size === s ? "text-primary-foreground/90" : "text-destructive"}`}>{lowN(sizeStock[s] ?? 0)}</span>}
              </label>
              );
            })}
          </div>
          {missing && (
            <p role="alert" className="text-sm text-destructive">
              {t.sizeRequired}
            </p>
          )}
        </fieldset>
      )}
      {showQty && (
        <div className="inline-flex items-center rounded-md border" role="group" aria-label={fr ? "Quantité" : "Quantity"}>
          <button type="button" className="size-11 text-lg disabled:opacity-40" aria-label={fr ? "Diminuer" : "Decrease"} disabled={q <= 1} onClick={() => { setAdded(false); setQty(q - 1); }}>−</button>
          <span className="min-w-8 text-center text-sm" aria-live="polite">{q}</span>
          <button type="button" className="size-11 text-lg disabled:opacity-40" aria-label={fr ? "Augmenter" : "Increase"} disabled={q >= maxQty} onClick={() => { setAdded(false); setQty(q + 1); }}>+</button>
        </div>
      )}
      <Button
        size="lg"
        className="h-12 w-full"
        disabled={disabled}
        onClick={() => {
          if (sizes.length > 0 && !size) {
            setMissing(true);
            return;
          }
          add({ slug, size, name, creatorName, image, priceCents, maxQuantity: sizeStock && size ? sizeStock[size] ?? stock : stock }, showQty ? q : 1);
          setAdded(true);
        }}
      >
        {stock === 0 ? t.outOfStock : t.addToCart}
      </Button>
      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {added && (
          <span className="text-kente">
            {t.added} —{" "}
            <Link href={`/${locale}/cart`} className={buttonVariants({ variant: "link", className: "h-auto p-0" })}>
              {t.viewCart}
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
