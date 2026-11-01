import type { Metadata } from "next";
import { CartView } from "@/components/marketplace/cart-view";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).cart.title };
}

export default async function CartPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-primary">{getDict(locale).cart.title}</h1>
      <CartView locale={locale} />
    </div>
  );
}
