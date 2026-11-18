import { NextResponse } from "next/server";
import { requestReturnForUser } from "@/lib/customer-orders";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Demande de retour (14 jours après livraison, une seule par colis) : même logique que requestReturnAction du site.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; reason?: unknown; photos?: unknown };
  const photos = Array.isArray(body.photos) ? body.photos.map(String) : [];
  const r = await requestReturnForUser(user.id, user.email, String(body.id ?? ""), String(body.reason ?? ""), photos);
  if (r.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: r.error }, { status: r.error === "forbidden" ? 403 : r.error === "reason" || r.error === "photos" ? 400 : 409 });
}
