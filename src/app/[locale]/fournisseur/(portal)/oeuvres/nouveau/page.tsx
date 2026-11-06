import { ArtworkForm } from "@/components/fournisseur/forms";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/supplier-mock";

export const metadata = { title: "Déposer une œuvre", robots: { index: false } };

export default async function NewArtwork({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Déposer une œuvre", "Add an artwork")}</h1>
      <div className="max-w-2xl"><ArtworkForm locale={locale} /></div>
    </>
  );
}
