import { NextResponse } from "next/server";
import { localeOf, paramsOf, sizesFor } from "@/lib/api-v1";
import { getFilterOptions, searchProducts } from "@/lib/catalog";

// Nombre de résultats et options recalculées pour l'écran « Affiner » (même logique que /api/catalog/count du site).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params = paramsOf(sp);
  const locale = localeOf(sp.get("locale"));
  const [{ total }, options] = await Promise.all([searchProducts(params, locale), getFilterOptions(locale, params.category)]);
  return NextResponse.json({ total, options, sizes: sizesFor(params.category) });
}
