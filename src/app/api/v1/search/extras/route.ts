import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { searchExtras } from "@/lib/catalog";

// Artistes correspondants, « vouliez-vous dire » et artistes suggérés : même source que la page /catalogue du site.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const abs = (p: string) => (/^https?:/.test(p) ? p : `${url.origin}${p}`);
  const fix = <T extends { image: string }>(a: T) => ({ ...a, image: abs(a.image) });
  const x = await searchExtras(q, localeOf(url.searchParams.get("locale")));
  return NextResponse.json({ artists: x.artists.map(fix), didYouMean: x.didYouMean, suggested: x.suggested.map(fix) });
}
