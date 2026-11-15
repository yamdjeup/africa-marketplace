import { db } from "@/lib/db";
import { live, searchProducts, toProductView, type ProductView } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";
import type { TilaProduct, ToolDeps } from "@/lib/tila/tools";

const toTila = (p: ProductView): TilaProduct => ({
  slug: p.slug,
  name: p.name,
  creatorName: p.creatorName,
  priceCents: p.priceCents,
  material: p.material,
  sizes: p.sizes,
  categorySlug: p.categorySlug,
  image: p.images[0] ?? null,
  stock: p.stock,
});

/** Accès catalogue du modèle : lecture seule, mêmes règles de visibilité que la boutique (publié, partenaire rattaché). */
export function catalogDeps(locale: Locale): ToolDeps {
  return {
    search: async (p) => (await searchProducts(p, locale)).items.map(toTila),
    get: async (slug) => {
      const row = await db.product.findFirst({ where: { slug, ...live }, include: { creator: { select: { name: true } }, variants: true } });
      return row ? toTila(toProductView(row, locale)) : null;
    },
  };
}
