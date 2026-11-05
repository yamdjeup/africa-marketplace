import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

const COPY = {
  fr: {
    back: "Mon compte",
    title: "E póm ta’",
    subtitle: "« Tu es très belle », en ghomálá’, langue bamiléké du Cameroun.",
    words: ["Héritage", "Beauté", "Fierté"],
    lead: "Ce n'est pas une boutique. C'est un compliment. Celui qu'on murmure devant une toile, une étoffe, un visage.",
    body: [
      "E póm ta’ est une vitrine digitale où l'art afrodescendant se montre tel qu'il est : fier, vivant, sans excuse. Peintres, sculpteurs, photographes, créateurs de mode : chaque artiste y garde sa voix, son geste, son pays.",
      "Nous revendiquons l'héritage, la beauté et la fierté d'une création qui traverse les continents et les générations.",
    ],
    closing: "Entrez. Regardez longtemps. Et si une œuvre vous parle, laissez-la entrer chez vous.",
    promiseTitle: "Notre promesse aux artistes",
    promise: [
      "Leur voix est respectée : ils parlent de leur travail avec leurs mots.",
      "Chaque œuvre est présentée avec son histoire.",
      "Le nom, le crédit et le pays de chaque artiste sont toujours indiqués.",
    ],
    works: "Découvrir les œuvres",
    artists: "Rencontrer les artistes",
  },
  en: {
    back: "My account",
    title: "E póm ta’",
    subtitle: "“You are very beautiful”, in Ghomálá’, a Bamileke language of Cameroon.",
    words: ["Heritage", "Beauty", "Pride"],
    lead: "This is not a shop. It is a compliment. The kind you whisper in front of a canvas, a fabric, a face.",
    body: [
      "E póm ta’ is a digital showcase where Afro-descendant art appears as it is: proud, alive, unapologetic. Painters, sculptors, photographers, fashion designers: each artist keeps their own voice, their gesture, their country.",
      "We claim the heritage, the beauty and the pride of a creation that crosses continents and generations.",
    ],
    closing: "Come in. Look for a long time. And if a work speaks to you, let it come home with you.",
    promiseTitle: "Our promise to artists",
    promise: [
      "Their voice is respected: they speak about their work in their own words.",
      "Every work is presented with its story.",
      "Each artist's name, credit and country are always shown.",
    ],
    works: "Discover the works",
    artists: "Meet the artists",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "About" : "À propos", robots: { index: false } };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const c = COPY[locale === "en" ? "en" : "fr"];
  return (
    <article className="mx-auto max-w-2xl space-y-10 pb-8">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {c.back}
      </Link>
      <header className="space-y-4 text-center">
        <div className="kente-band h-1.5 w-full rounded-full" aria-hidden="true" />
        <h1 className="font-heading text-6xl text-primary sm:text-7xl">{c.title}</h1>
        <p className="text-sm italic text-muted-foreground">{c.subtitle}</p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 pt-2 text-xs uppercase tracking-[0.3em] text-terracotta">
          {c.words.map((w, i) => (
            <span key={w}>
              {i > 0 && <span aria-hidden="true" className="mr-3">·</span>}
              {w}
            </span>
          ))}
        </p>
        <div className="kente-band h-1.5 w-full rounded-full" aria-hidden="true" />
      </header>
      <section className="space-y-5 text-center">
        <p className="font-heading text-2xl leading-snug text-primary sm:text-3xl">{c.lead}</p>
        {c.body.map((p) => (
          <p key={p} className="text-base leading-loose">
            {p}
          </p>
        ))}
        <p className="font-heading text-xl italic text-terracotta">{c.closing}</p>
      </section>
      <section className="rounded-lg border border-accent/60 bg-accent/10 p-6">
        <h2 className="font-heading text-2xl text-primary">{c.promiseTitle}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {c.promise.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden="true" className="text-terracotta">◆</span>
              {p}
            </li>
          ))}
        </ul>
      </section>
      <nav className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href={`/${locale}/catalogue`} className="rounded-md bg-primary px-6 py-3 text-sm text-primary-foreground hover:opacity-90">
          {c.works}
        </Link>
        <Link href={`/${locale}/createurs`} className="rounded-md border border-primary px-6 py-3 text-sm text-primary hover:bg-primary/5">
          {c.artists}
        </Link>
      </nav>
    </article>
  );
}
