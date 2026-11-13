import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { othersHaveInCart, syncInterest, validToken } from "@/lib/cart-interest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; slugs?: unknown } | null;
  if (!body || !validToken(body.token) || !Array.isArray(body.slugs)) return NextResponse.json({ ok: false }, { status: 400 });
  await syncInterest(db, body.token, body.slugs.filter((s): s is string => typeof s === "string")).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token");
  const slug = u.searchParams.get("slug") ?? "";
  if (!validToken(token) || !slug) return NextResponse.json({ others: false });
  const others = await othersHaveInCart(db, slug, token).catch(() => false);
  return NextResponse.json({ others });
}
