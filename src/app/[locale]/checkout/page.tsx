import type { Metadata } from "next";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/marketplace/checkout-form";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).checkout.title };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await auth();
  const user = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id } }) : null;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-primary">{getDict(locale).checkout.title}</h1>
      <CheckoutForm locale={locale} user={user ? { name: user.name, email: user.email } : null} />
    </div>
  );
}
