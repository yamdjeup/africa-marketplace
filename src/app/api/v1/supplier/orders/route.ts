import { NextResponse } from "next/server";
import { supplierFromRequest, supplierOrders } from "@/lib/mobile-supplier";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await supplierFromRequest(req);
  if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") ?? "todo";
  return NextResponse.json({ orders: await supplierOrders(s.id, status) });
}
