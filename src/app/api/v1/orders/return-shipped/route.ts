import { NextResponse } from "next/server";
import { confirmReturnShippedForUser } from "@/lib/customer-orders";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Confirmation de l'expédition du retour par le client : même logique que confirmReturnShippedAction du site.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: unknown; carrier?: unknown; tracking?: unknown };
  const r = await confirmReturnShippedForUser(user.id, user.email, String(b.id ?? ""), String(b.carrier ?? ""), String(b.tracking ?? ""));
  if (r === "ok") return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: r }, { status: r === "invalid" ? 400 : 409 });
}
