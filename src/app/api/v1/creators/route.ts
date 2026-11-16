import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { getCreators } from "@/lib/catalog";
import { parseTab, tabOf } from "@/lib/shop-groups";

// Même données que /boutique/artistes (annuaire filtré par onglet Art / Mode).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = localeOf(url.searchParams.get("locale"));
  const tab = parseTab(url.searchParams.get("tab") ?? undefined);
  const all = await getCreators(locale);
  const items = all
    .filter((c) => tab === "all" || c.categories.some((k) => tabOf(k) === tab))
    .map((c) => ({ slug: c.slug, name: c.name, countries: c.countries }));
  return NextResponse.json({ items });
}
