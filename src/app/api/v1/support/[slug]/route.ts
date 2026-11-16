import { NextResponse } from "next/server";
import { localeOf } from "@/lib/api-v1";
import { supportDoc } from "@/lib/support-content";

// Texte d'une page d'aide, identique à /[locale]/support/[slug] du site.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const doc = supportDoc(slug, localeOf(new URL(req.url).searchParams.get("locale")));
  return doc ? NextResponse.json(doc) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
