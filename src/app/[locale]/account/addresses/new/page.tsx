import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AddressForm } from "@/components/marketplace/address-form";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).me.newAddress, robots: { index: false } };
}

export default async function NewAddressPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/addresses/new`)}`);
  const t = getDict(locale).me;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={next?.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/account/addresses`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.newAddress}</h1>
      <AddressForm locale={locale} next={next} error={error === "postal" ? "postal" : error ? "required" : undefined} />
    </div>
  );
}
