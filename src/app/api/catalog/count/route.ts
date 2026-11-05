import { NextResponse } from "next/server";
import { searchProducts, type CatalogParams } from "@/lib/catalog";

const num = (v: string | null) => {
  const n = v === null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// Nombre de résultats pour l'écran « Affiner » (mêmes filtres que /catalogue).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const get = (k: string) => sp.get(k) || undefined;
  const sort = sp.get("sort");
  const params: CatalogParams = {
    q: get("q"),
    category: get("category"),
    artist: get("artist"),
    material: get("material"),
    technique: get("technique"),
    country: get("country"),
    size: get("size"),
    min: num(sp.get("min")),
    max: num(sp.get("max")),
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "new",
  };
  const { total } = await searchProducts(params, "fr");
  return NextResponse.json({ total });
}
