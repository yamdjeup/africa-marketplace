import { NextResponse } from "next/server";
import { listOrders } from "@/lib/mobile-checkout";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ orders: await listOrders(user.id) });
}
