import { NextResponse } from "next/server";
import { countryByName } from "@/lib/address";
import { checkPostalCity } from "@/lib/address-provider";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const postalCode = (sp.get("postalCode") ?? "").trim().slice(0, 12);
  const city = (sp.get("city") ?? "").trim().slice(0, 100);
  const cc = countryByName(sp.get("country") ?? "")?.code ?? "";
  if (!postalCode || !city) return NextResponse.json({ status: "unknown" });
  const status = await checkPostalCity(postalCode, city, cc, sp.get("locale") === "en" ? "en" : "fr");
  return NextResponse.json({ status });
}
