import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/catalog";
import { suggest } from "@/lib/search-index";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  return NextResponse.json(suggest(await getSearchIndex(), q, locale));
}
