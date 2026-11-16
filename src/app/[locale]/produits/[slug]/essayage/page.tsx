import { notFound } from "next/navigation";
import { MirrorTryOn } from "@/components/marketplace/mirror-try-on";
import { RoomPreview } from "@/components/marketplace/room-preview";
import { MIRROR_CATEGORIES, MIRROR_ITEMS } from "@/data/mirror-items";
import { getProduct } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";

const ROOM_CATEGORIES = ["peinture", "sculpture", "photographie", "textile-decoration"];

// Page ouverte depuis l'app mobile : mêmes composants que la fiche produit du site.
export default async function TryOnPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getProduct(slug, locale);
  if (!data) notFound();
  const p = data.product;
  const mirror = MIRROR_CATEGORIES.includes(p.categorySlug) && p.images.length > 0 ? MIRROR_ITEMS[p.slug] : undefined;
  const roomOk = ROOM_CATEGORIES.includes(p.categorySlug) && !!p.widthCm && !!p.heightCm && p.widthCm > 0 && p.heightCm > 0 && p.images.length > 0;
  if (!mirror && !roomOk) notFound();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <style>{`body > header, body header, body footer, body > nav { display: none !important; }`}</style>
      <h1 className="font-heading text-2xl text-primary">{p.name}</h1>
      {roomOk && (
        <RoomPreview locale={locale} image={p.images[0]} name={p.name} widthCm={p.widthCm!} heightCm={p.heightCm!} flat={p.categorySlug !== "sculpture"} />
      )}
      {mirror && <MirrorTryOn locale={locale} image={p.images[0]} name={p.name} kind={mirror.kind} />}
    </div>
  );
}
