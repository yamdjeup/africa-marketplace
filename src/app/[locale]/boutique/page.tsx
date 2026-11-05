import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).f4.shopTitle };
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  const f = getDict(locale).f4;
  const categories = await getCategories(locale);
  const rows = [
    ...categories.map((c) => ({ key: c.slug, href: `/${locale}/catalogue?category=${c.slug}`, label: c.label })),
    { key: "artists", href: `/${locale}/createurs`, label: f.shopArtists },
  ];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-heading text-3xl font-normal text-primary">{f.shopTitle}</h1>
      <ul>
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="flex min-h-14 items-center justify-between border-b px-1 text-base hover:text-terracotta">
              <span>{r.label}</span>
              <span aria-hidden="true" className="text-muted-foreground">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
