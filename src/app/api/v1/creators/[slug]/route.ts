import { NextResponse } from "next/server";
import { localeOf, oneCreator } from "@/lib/api-v1";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const c = await oneCreator(slug, localeOf(url.searchParams.get("locale")), url.origin);
  return c ? NextResponse.json(c) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
