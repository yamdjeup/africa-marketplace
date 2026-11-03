import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AddressForm } from "@/components/marketplace/address-form";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ next?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).me.editAddress, robots: { index: false } };
}

export default async function EditAddressPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { next, error } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/addresses/${id}`)}`);
  const a = await db.address.findFirst({ where: { id, userId: session.user.id } });
  if (!a) notFound();
  const [first, ...rest] = a.fullName.split(" ");
  const t = getDict(locale).me;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={next?.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/account/addresses`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.editAddress}</h1>
      <AddressForm
        locale={locale}
        next={next}
        error={error === "postal" ? "postal" : error ? "required" : undefined}
        address={{
          id: a.id,
          firstName: a.firstName || first,
          lastName: a.lastName || rest.join(" "),
          line1: a.line1,
          houseNumber: a.houseNumber,
          box: a.box ?? "",
          line2: a.line2 ?? "",
          postalCode: a.postalCode,
          city: a.city,
          country: a.country,
          phone: a.phone,
          isDefault: a.isDefault,
        }}
      />
    </div>
  );
}
