import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/marketplace/product-card";
import { getCreatorWithProducts } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

const CREATOR_VIDEOS: Record<string, { src: string; poster: string }> = {
  kenof: { src: "/videos/kenof.mp4", poster: "/videos/posters/kenof-poster.jpg" },
  "nathalie-morere": { src: "/videos/nathalie.mp4", poster: "/videos/posters/nathalie-poster.jpg" },
  "cruzz-taylor": { src: "/videos/taylor.mp4", poster: "/videos/posters/taylor-poster.jpg" },
};

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
  const video = CREATOR_VIDEOS[slug];
  const sentences = c.bio.match(/[^.!?]+[.!?]/g)?.map((s) => s.trim()) ?? [c.bio];
  const excerpt = sentences[sentences.length - 1];
  // La phrase citée à côté de la vidéo n'est pas répétée dans la bio affichée.
  const bio = video && sentences.length > 1 ? sentences.slice(0, -1).join(" ") : c.bio;

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
          <p className="max-w-prose pt-2">{bio}</p>
          <p className="text-xs text-muted-foreground">
            {t.bioSource}.{" "}
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {t.readSource}
            </a>
          </p>
        </div>
      </header>
      {video && (
        <section
          aria-labelledby="meet"
          className="flex flex-col items-center gap-4 rounded-2xl border border-accent bg-card p-4 md:flex-row md:items-center md:gap-8 md:p-5"
        >
          <video
            controls
            preload="metadata"
            playsInline
            src={video.src}
            poster={video.poster}
            aria-label={`${t.meet} ${c.name}`}
            className="aspect-[9/16] w-full max-w-[320px] shrink-0 rounded-xl bg-black object-contain md:w-[340px] md:max-w-none"
          />
          <div className="min-w-0 flex-1 space-y-4 text-center md:text-left">
            <h2 id="meet" className="font-heading text-2xl text-primary">
              {t.meet} {c.name}
            </h2>
            <p className="max-w-prose">{t.meetIntro}</p>
            <figure className="space-y-1">
              <blockquote className="font-heading text-lg italic leading-snug text-primary">
                <span aria-hidden className="mr-1 text-3xl leading-none text-accent">
                  “
                </span>
                {excerpt}
                <span aria-hidden className="ml-1 text-3xl leading-none text-accent">
                  ”
                </span>
              </blockquote>
            </figure>
          </div>
        </section>
      )}
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
