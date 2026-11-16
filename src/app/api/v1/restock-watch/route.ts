import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buyerKeyOf } from "@/lib/checkout-hold";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// Même logique que src/app/api/restock-watch/route.ts, authentification Bearer.
export async function GET(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const rows = await db.restockWatch.findMany({ where: { buyerKey: buyerKeyOf(u.id, u.email), notifiedAt: null }, select: { productSlug: true } });
  return NextResponse.json({ slugs: rows.map((r) => r.productSlug) });
}

export async function POST(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { slug?: unknown; locale?: unknown };
  if (typeof b.slug !== "string") return NextResponse.json({ error: "bad" }, { status: 400 });
  const p = await db.product.findUnique({ where: { slug: b.slug }, select: { slug: true } });
  if (!p) return NextResponse.json({ error: "notfound" }, { status: 404 });
  const buyerKey = buyerKeyOf(u.id, u.email);
  const locale = b.locale === "en" ? "en" : "fr";
  await db.restockWatch.upsert({
    where: { buyerKey_productSlug: { buyerKey, productSlug: p.slug } },
    update: { notifiedAt: null, email: u.email, locale, source: "NOTIFY" },
    create: { buyerKey, email: u.email, locale, productSlug: p.slug, source: "NOTIFY" },
  });
  return NextResponse.json({ watching: true });
}

export async function DELETE(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "bad" }, { status: 400 });
  await db.restockWatch.deleteMany({ where: { buyerKey: buyerKeyOf(u.id, u.email), productSlug: slug } });
  return NextResponse.json({ watching: false });
}
