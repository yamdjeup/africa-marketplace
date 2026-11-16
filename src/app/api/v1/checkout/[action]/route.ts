import { NextResponse } from "next/server";
import { cancelMobilePayment, confirmMobilePayment, createMobilePayment } from "@/lib/mobile-checkout";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { addressId?: unknown; cart?: unknown; number?: unknown };
  if (action === "create") {
    const r = await createMobilePayment(user, String(body.addressId ?? ""), body.cart);
    return NextResponse.json(r, { status: "error" in r ? (r.error === "disabled" || r.error === "payment" ? 503 : 409) : 200 });
  }
  const number = String(body.number ?? "");
  if (action === "confirm") return NextResponse.json(await confirmMobilePayment(user, number));
  if (action === "cancel") return NextResponse.json({ released: await cancelMobilePayment(user, number) });
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
