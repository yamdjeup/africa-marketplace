import { NextResponse } from "next/server";
import { localeOf, oneProduct } from "@/lib/api-v1";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const p = await oneProduct(slug, localeOf(url.searchParams.get("locale")), url.origin);
  return p ? NextResponse.json(p) : NextResponse.json({ error: "not_found" }, { status: 404 });
}