import { NextResponse } from "next/server";
import { cancelMobilePayment, confirmMobilePayment, createMobilePayment } from "@/lib/mobile-checkout";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  // Comme le site : connecté (Bearer) ou invité (e-mail + adresse saisie ; jeton invité renvoyé à la création).
  const user = await userFromRequest(req);
  const body = (await req.json().catch(() => ({}))) as { addressId?: unknown; address?: Record<string, unknown>; email?: unknown; cart?: unknown; number?: unknown; guestToken?: unknown };
  if (action === "create") {
    const r = await createMobilePayment(user, { addressId: body.addressId, address: body.address && typeof body.address === "object" ? body.address : undefined, email: body.email }, body.cart);
    const status = !("error" in r) ? 200 : r.error === "disabled" || r.error === "payment" ? 503 : r.error === "email" || r.error === "address" || r.error === "postal" ? 400 : 409;
    return NextResponse.json(r, { status });
  }
  const number = String(body.number ?? "");
  const guestToken = typeof body.guestToken === "string" ? body.guestToken : "";
  if (!user && !guestToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (action === "confirm") return NextResponse.json(await confirmMobilePayment(user, number, guestToken));
  if (action === "cancel") return NextResponse.json({ released: await cancelMobilePayment(user, number, guestToken) });
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
