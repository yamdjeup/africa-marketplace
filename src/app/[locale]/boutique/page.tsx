import type { Metadata } from "next";
import { ShopRow } from "@/components/marketplace/shop-row";
import { ShopTopBar } from "@/components/marketplace/shop-topbar";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f4.shopTitle };
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  const t = getDict(locale);
  const f = t.f4;
  const rows = [
    { key: "artists", href: `/${locale}/boutique/artistes`, label: t.f11.artistsTitle },
    { key: "categories", href: `/${locale}/boutique/categories`, label: t.f11.categoriesTitle },
  ];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <ShopTopBar locale={locale} title={f.shopTitle} />
      <h1 className="sr-only">{f.shopTitle}</h1>
      <ul>
        {rows.map((r) => (
          <ShopRow key={r.key} href={r.href} label={r.label} />
        ))}
      </ul>
    </div>
  );
}
