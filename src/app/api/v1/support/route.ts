import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { supportIndex } from "@/lib/support-content";

// Sommaire du support et de l'aide (mêmes rubriques que le compte du site).
export async function GET(req: Request) {
  return NextResponse.json(supportIndex(localeOf(new URL(req.url).searchParams.get("locale"))));
}
