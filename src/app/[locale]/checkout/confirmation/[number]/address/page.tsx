import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrderAddressForm } from "@/components/marketplace/order-address-form";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";
import { isAddressEditable, isOrderOwner } from "@/lib/order-edit";

type Props = { params: Promise<{ locale: Locale; number: string }>; searchParams: Promise<{ t?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).confirmation.editTitle, robots: { index: false } };
}

export default async function EditOrderAddressPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const { t: token, error } = await searchParams;
  const order = await db.order.findUnique({ where: { number } });
  if (!order) notFound();
  const session = await auth();
  const back = `/${locale}/checkout/confirmation/${number}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
  if (!isOrderOwner(order, token, session?.user?.id) || !isAddressEditable(order.createdAt)) redirect(back);
  const t = getDict(locale);
  const [first, ...rest] = order.fullName.split(" ");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={back} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.me.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.confirmation.editTitle}</h1>
      <OrderAddressForm
        locale={locale}
        number={number}
        token={token}
        error={error === "postal" ? "postal" : error ? "required" : undefined}
        initial={{
          firstName: first,
          lastName: rest.join(" "),
          country: order.country,
          line1: order.street || order.address,
          houseNumber: order.houseNumber,
          box: order.box ?? "",
          line2: order.complement ?? "",
          postalCode: order.postalCode,
          city: order.city,
          phone: order.phone,
        }}
      />
    </div>
  );
}
