"use client";

import { useCart } from "@/lib/cart";
import type { Locale } from "@/lib/i18n";

// Un colis par créateur : articles, délai de préparation et frais de livraison de chaque envoi.
export function ParcelSummary({ locale }: { locale: Locale }) {
  const { lines, ready } = useCart();
  const en = locale === "en";
  if (!ready || lines.length === 0) return null;
  const parcels = new Map<string, typeof lines>();
  for (const l of lines) parcels.set(l.creatorName, [...(parcels.get(l.creatorName) ?? []), l]);
  const n = parcels.size;
  const message = en
    ? n === 1
      ? "Your order will be shipped in 1 parcel, by 1 creator."
      : `Your order will be shipped in ${n} parcels, by ${n} different creators, on different dates.`
    : n === 1
      ? "Votre commande sera expédiée en 1 colis, par 1 créateur."
      : `Votre commande sera expédiée en ${n} colis, par ${n} créateurs différents, à des dates différentes.`;
  return (
    <section aria-label={en ? "Parcels" : "Colis"} className="space-y-3 text-sm">
      <p className="rounded-md bg-muted p-3 font-medium">{message}</p>
      <ul className="space-y-3">
        {[...parcels].map(([creator, ls], i) => (
          <li key={creator} className="space-y-1 rounded-md border p-3">
            <p className="font-semibold">
              {en ? "Parcel" : "Colis"} {i + 1}/{n} — {creator}
            </p>
            <ul className="text-muted-foreground">
              {ls.map((l) => (
                <li key={`${l.slug}|${l.size ?? ""}`}>
                  {l.quantity} × {l.name}
                  {l.size ? ` (${l.size})` : ""}
                </li>
              ))}
            </ul>
            <p>{en ? "Prepared within 2 business days" : "Préparation sous 2 jours ouvrés"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
