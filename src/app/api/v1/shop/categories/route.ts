import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { getCategoryMenu, getCategoryShowcase, getFilterOptions } from "@/lib/catalog";
import { tabOf } from "@/lib/shop-groups";

// Mêmes données que /boutique/categories, /[slug] et /[slug]/[view] (niveaux 2 à 4 du site).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = localeOf(url.searchParams.get("locale"));
  const slug = url.searchParams.get("slug");
  const [showcase, menu] = await Promise.all([getCategoryShowcase(locale), getCategoryMenu(locale)]);
  const cats = showcase.filter((c) => c.count > 0).map((c) => ({ slug: c.slug, label: c.label, count: c.count, tab: tabOf(c.slug) }));
  if (!slug) return NextResponse.json({ cats });
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const options = await getFilterOptions(locale, slug);
  const artists = (menu.find((m) => m.slug === slug)?.artists ?? []).map((a) => ({ slug: a.slug, name: a.name }));
  return NextResponse.json({ cat, techniques: options.techniques, materials: options.materials, artists });
}
