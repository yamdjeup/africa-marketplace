import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/marketplace/product-card";
import { getCreatorWithProducts } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCreatorWithProducts(slug, locale);
  if (!data) return { title: getDict(locale).creator.notFound };
  return { title: data.creator.name, description: data.creator.bio };
}

export default async function CreatorPage({ params }: Props) {
  const { locale, slug } = await params;
  const data = await getCreatorWithProducts(slug, locale);
  if (!data) notFound();
  const { creator: c, products } = data;
  const t = getDict(locale).creator;

  return (
    <div className="space-y-10">
      <header className="flex flex-col items-center gap-5 text-center md:flex-row md:items-start md:text-left">
        <Image
          src={c.image}
          alt={c.name}
          width={160}
          height={160}
          unoptimized
          priority
          className="size-32 rounded-full object-cover ring-4 ring-accent md:size-40"
        />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl text-primary">{c.name}</h1>
          <p className="text-xs uppercase tracking-wide text-terracotta">{c.specialty}</p>
          <p className="max-w-prose pt-2">{c.bio}</p>
          <p className="text-xs text-muted-foreground">
            {t.bioSource}.{" "}
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {t.readSource}
            </a>
          </p>
        </div>
      </header>
      <section aria-labelledby="pieces" className="space-y-4">
        <h2 id="pieces" className="font-heading text-2xl text-primary">
          {t.pieces}
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {products.map((p) => (
            <li key={p.slug}>
              <ProductCard product={p} locale={locale} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
