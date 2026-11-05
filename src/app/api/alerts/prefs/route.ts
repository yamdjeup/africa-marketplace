import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const u = await db.user.findUnique({ where: { id: session.user.id }, select: { alertFavorites: true, alertPromo: true, email: true } });
  if (!u) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ email: u.alertFavorites, promo: u.alertPromo, address: u.email });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; promo?: unknown };
  const data: { alertFavorites?: boolean; alertPromo?: boolean; promoSince?: Date | null } = {};
  if (typeof body.email === "boolean") data.alertFavorites = body.email;
  if (typeof body.promo === "boolean") {
    data.alertPromo = body.promo;
    data.promoSince = body.promo ? new Date() : null;
  }
  await db.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true });
}
