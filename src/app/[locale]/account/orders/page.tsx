import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrderStatusBadge } from "@/components/marketplace/order-status";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { simulatedStatus } from "@/lib/order-status";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).account.orders.title, robots: { index: false } };
}

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/orders`)}`);
  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const t = getDict(locale).account.orders;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-3xl text-primary">{t.title}</h1>
      <p className="text-sm text-muted-foreground">{t.simulated}</p>
      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-heading text-xl">{t.empty}</p>
          <Link href={`/${locale}/catalogue`} className={buttonVariants({ className: "mt-4" })}>
            {t.browse}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-semibold">
                  {t.number} {o.number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.date} {fmt.format(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} {t.items.toLowerCase()}
                </p>
                <OrderStatusBadge status={simulatedStatus(o.createdAt)} t={t} />
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">{formatEur(o.totalCents, locale)}</span>
                <Link href={`/${locale}/account/orders/${o.number}`} className={buttonVariants({ variant: "outline" })}>
                  {t.view}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
