import type { Metadata } from "next";
import { AlertsForm } from "@/components/marketplace/alerts-form";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).wishlist.alertsTitle };
}

export default async function AlertsPage({ params }: Props) {
  const { locale } = await params;
  return <AlertsForm locale={locale} />;
}
