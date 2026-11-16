import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { getSearchIndex } from "@/lib/catalog";
import { suggest } from "@/lib/search-index";

// Même logique que /api/search/suggest du site (barre de recherche).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  return NextResponse.json(suggest(await getSearchIndex(), q, localeOf(url.searchParams.get("locale"))));
}
