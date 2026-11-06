import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { ARTWORKS, ARTWORK_STATUS, money, tr } from "@/lib/supplier-mock";

export const metadata = { title: "Mes œuvres", robots: { index: false } };

export default async function ArtworksPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lk = locale === "en" ? "en" : "fr";
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Œuvres", "Artworks")}</h1>
        <Link href={`/${locale}/fournisseur/oeuvres/nouveau`} className={buttonVariants({ className: "min-h-11" })}>{tr(locale, "Déposer une œuvre", "Add an artwork")}</Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ARTWORKS.map((a) => (
          <li key={a.id} className="overflow-hidden rounded-lg border bg-card">
            <div aria-hidden="true" className={`aspect-[4/3] bg-gradient-to-br ${a.tone}`} />
            <div className="space-y-1 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-heading text-lg">{a.title[lk]}</p>
                <Pill cls={ARTWORK_STATUS[a.status].cls}>{ARTWORK_STATUS[a.status][lk]}</Pill>
              </div>
              <p className="text-muted-foreground">{a.type[lk]} · {a.size}</p>
              <p className="font-semibold">{money(locale, a.price, a.currency)}</p>
              <p className="text-xs text-muted-foreground">{a.stock === "unique" ? tr(locale, "Pièce unique", "One-of-a-kind") : `Stock : ${a.stock}`}</p>
              <span className="inline-block min-h-11 content-center text-xs text-muted-foreground underline">{tr(locale, "Modifier (maquette)", "Edit (mockup)")}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
