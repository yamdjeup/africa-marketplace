import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function current(userId: string) {
  const rows = await db.favorite.findMany({ where: { userId }, select: { productSlug: true } });
  return rows.map((r) => r.productSlug);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ slugs: await current(session.user.id) });
}

// Remplace l'ensemble des favoris ; les pièces déjà suivies gardent leur dernier état notifié.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = session.user.id;
  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown };
  const wanted = Array.isArray(body.slugs) ? [...new Set(body.slugs.filter((s): s is string => typeof s === "string"))].slice(0, 200) : [];
  const existing = new Set(await current(userId));
  await db.favorite.deleteMany({ where: { userId, productSlug: { notIn: wanted } } });
  const toAdd = wanted.filter((s) => !existing.has(s));
  if (toAdd.length) {
    const products = await db.product.findMany({ where: { slug: { in: toAdd } }, select: { slug: true, priceCents: true, stock: true, reserved: true } });
    for (const p of products) {
      await db.favorite.create({ data: { userId, productSlug: p.slug, lastPriceCents: p.priceCents, lastStock: Math.max(0, p.stock - p.reserved) } });
    }
  }
  return NextResponse.json({ slugs: await current(userId) });
}
