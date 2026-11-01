import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/marketplace/clear-cart-on-mount";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatEur, getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).confirmation.title, robots: { index: false } };
}

export default async function ConfirmationPage({ params }: Props) {
  const { locale, number } = await params;
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order) notFound();
  const t = getDict(locale).confirmation;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ClearCartOnMount />
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl text-primary">{t.title}</h1>
        <p className="text-muted-foreground">{t.text}</p>
        <p>
          {t.reference} : <strong>{order.number}</strong>
        </p>
      </div>
      <section aria-labelledby="items" className="space-y-3 rounded-lg border p-4">
        <h2 id="items" className="font-heading text-xl">
          {t.items}
        </h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.quantity} × {i.name}
                {i.size ? ` (${i.size})` : ""}
              </span>
              <span>{formatEur(i.unitPriceCents * i.quantity, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-3 font-semibold">
          <span>{t.total}</span>
          <span>{formatEur(order.totalCents, locale)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t.to} {order.fullName}, {order.address}, {order.postalCode} {order.city}, {order.country}
        </p>
      </section>
      <div className="text-center">
        <Link href={`/${locale}`} className={buttonVariants({ variant: "outline" })}>
          {t.home}
        </Link>
      </div>
    </div>
  );
}
