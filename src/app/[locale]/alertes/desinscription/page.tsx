import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ ok?: string }> };

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ok } = await searchParams;
  const w = getDict(locale).wishlist;
  return (
    <div className="mx-auto max-w-xl space-y-4 py-8">
      <h1 className="font-heading text-3xl font-normal text-primary">{w.alertsTitle}</h1>
      <p role="status">{ok === "1" ? w.unsubOk : w.unsubBad}</p>
      <Link href={`/${locale}`} className="underline underline-offset-4">{getDict(locale).siteName}</Link>
    </div>
  );
}
