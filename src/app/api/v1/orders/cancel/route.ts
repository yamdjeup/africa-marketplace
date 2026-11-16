import { NextResponse } from "next/server";
import { cancelParcelForUser } from "@/lib/customer-orders";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Annulation d'un colis non expédié par son propriétaire (même logique que cancelMySubOrder du site).
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const ok = await cancelParcelForUser(user.id, user.email, String(body.id ?? ""));
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}
