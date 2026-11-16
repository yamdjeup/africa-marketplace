import { NextResponse } from "next/server";
import { homeData, localeOf } from "@/lib/api-v1";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(await homeData(localeOf(url.searchParams.get("locale")), url.origin));
}