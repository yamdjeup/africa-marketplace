import { NextResponse } from "next/server";
import { countryByName } from "@/lib/address";
import { getAddressProvider } from "@/lib/address-provider";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const locale = sp.get("locale") === "en" ? "en" : "fr";
  const provider = getAddressProvider();
  const placeId = sp.get("placeId");
  if (placeId && provider.resolve) {
    const s = await provider.resolve(placeId.slice(0, 300), locale);
    return NextResponse.json({ suggestion: s });
  }
  const q = (sp.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  const cc = countryByName(sp.get("country") ?? "")?.code;
  const suggestions = await provider.suggest(q, locale, cc);
  return NextResponse.json({ suggestions: suggestions ?? [] });
}
