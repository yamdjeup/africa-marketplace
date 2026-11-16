import { NextResponse } from "next/server";
import { supplierFromRequest } from "@/lib/mobile-supplier";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await supplierFromRequest(req);
  return NextResponse.json({ supplier: s ? { id: s.id, name: s.displayName } : null });
}
