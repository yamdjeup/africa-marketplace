import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/marketplace/cart-view";
import { ProductCard } from "@/components/marketplace/product-card";
import { RecentlyViewed } from "@/components/marketplace/recent-views";
import { ScrollRow } from "@/components/marketplace/scroll-row";
import { getFeaturedProducts } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).cart.title };
}

export default async function CartPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const recos = (await getFeaturedProducts(locale, 12)).slice(0, 10);
  const reass = [
    [t.f9.reassShipping, t.f9.reassShippingText],
    [t.f9.reassPayment, t.f9.reassPaymentText],
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-3xl text-primary">{t.cart.title}</h1>
        <Link href={`/${locale}/catalogue`} className="hidden text-sm underline underline-offset-4 hover:text-terracotta lg:inline">
          {t.cart.continue}
        </Link>
      </div>
      <CartView locale={locale} />
      <div className="hidden space-y-12 pt-8 lg:block">
        <section aria-labelledby="buynow" className="space-y-4">
          <div>
            <h2 id="buynow" className="font-heading text-2xl font-normal text-primary">{t.f9.buyNow}</h2>
            <p className="text-sm text-muted-foreground">{t.f9.buyNowSub}</p>
          </div>
          <ScrollRow label={t.f9.recommendations} prev={t.f4.prev} next={t.f4.next}>
            {recos.map((p) => (
              <li key={p.slug} className="w-56 shrink-0 snap-start">
                <ProductCard product={p} locale={locale} />
              </li>
            ))}
          </ScrollRow>
        </section>
        <RecentlyViewed locale={locale} title={t.f9.recent} />
        <ul className="grid grid-cols-3 gap-6 bg-muted p-6 text-center text-sm">
          {reass.map(([h, d]) => (
            <li key={h}>
              <p className="font-heading text-base">{h}</p>
              <p className="text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
