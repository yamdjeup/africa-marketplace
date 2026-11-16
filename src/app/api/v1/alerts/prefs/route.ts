import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// Même logique que src/app/api/alerts/prefs/route.ts, authentification Bearer.
export async function GET(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  return NextResponse.json({ email: u.alertFavorites, promo: u.alertPromo, address: u.email });
}

export async function PUT(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; promo?: unknown };
  const data: { alertFavorites?: boolean; alertPromo?: boolean; promoSince?: Date | null } = {};
  if (typeof body.email === "boolean") data.alertFavorites = body.email;
  if (typeof body.promo === "boolean") {
    data.alertPromo = body.promo;
    data.promoSince = body.promo ? new Date() : null;
  }
  await db.user.update({ where: { id: u.id }, data });
  return NextResponse.json({ ok: true });
}
