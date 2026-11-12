import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buyerKeyOf } from "@/lib/checkout-hold";

export const dynamic = "force-dynamic";

async function who() {
  const s = await auth();
  const u = s?.user;
  return u?.id && u.email ? { id: u.id, email: u.email } : null;
}

export async function POST(req: Request) {
  const u = await who();
  if (!u) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { slug?: unknown; locale?: unknown };
  if (typeof b.slug !== "string") return NextResponse.json({ error: "bad" }, { status: 400 });
  const p = await db.product.findUnique({ where: { slug: b.slug }, select: { slug: true } });
  if (!p) return NextResponse.json({ error: "notfound" }, { status: 404 });
  const buyerKey = buyerKeyOf(u.id, u.email);
  const locale = b.locale === "en" ? "en" : "fr";
  // Un nouvel abonnement réactive une veille déjà notifiée.
  await db.restockWatch.upsert({
    where: { buyerKey_productSlug: { buyerKey, productSlug: p.slug } },
    update: { notifiedAt: null, email: u.email, locale, source: "NOTIFY" },
    create: { buyerKey, email: u.email, locale, productSlug: p.slug, source: "NOTIFY" },
  });
  return NextResponse.json({ watching: true });
}

export async function DELETE(req: Request) {
  const u = await who();
  if (!u) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "bad" }, { status: 400 });
  await db.restockWatch.deleteMany({ where: { buyerKey: buyerKeyOf(u.id, u.email), productSlug: slug } });
  return NextResponse.json({ watching: false });
}
