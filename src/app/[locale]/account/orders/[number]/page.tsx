import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrderStatusBadge, OrderTimeline } from "@/components/marketplace/order-status";
import { SubOrderTracking } from "@/components/marketplace/sub-order-tracking";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { simulatedStatus } from "@/lib/order-status";
import { isAddressEditable } from "@/lib/order-edit";

type Props = { params: Promise<{ locale: Locale; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).account.orders.title, robots: { index: false } };
}

export default async function OrderDetailPage({ params }: Props) {
  const { locale, number } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/orders/${number}`)}`);
  const order = await db.order.findFirst({ where: { number, userId: session.user.id }, include: { items: true } });
  if (!order) notFound();
  const hasSubs = (await db.subOrder.count({ where: { orderId: order.id } })) > 0;
  const t = getDict(locale).account.orders;
  const status = simulatedStatus(order.createdAt);
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" }).format(order.createdAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl text-primary">
          {t.number} {order.number}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.date} {date}
        </p>
        {!hasSubs && <OrderStatusBadge status={status} t={t} />}
      </div>
      {!hasSubs && (
      <section aria-labelledby="tracking" className="space-y-3">
        <h2 id="tracking" className="font-heading text-xl">
          {t.timeline}
        </h2>
        <OrderTimeline status={status} t={t} />
        <p className="text-xs text-muted-foreground">{t.simulated}</p>
      </section>
      )}
      <SubOrderTracking orderId={order.id} locale={locale} />
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
          {t.shipTo} {order.fullName}, {order.address}, {order.postalCode} {order.city}, {order.country}
          {order.phone ? ` — ${order.phone}` : ""}
        </p>
        {isAddressEditable(order.createdAt) && (
          <Link href={`/${locale}/checkout/confirmation/${order.number}/address`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-terracotta">
            {getDict(locale).confirmation.editAddress}
          </Link>
        )}
      </section>
      <Link href={`/${locale}/account/orders`} className={buttonVariants({ variant: "outline" })}>
        {t.back}
      </Link>
    </div>
  );
}
