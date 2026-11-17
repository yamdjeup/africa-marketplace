import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { partnerReturnList } from "@/lib/partner-returns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await supplierFromRequest(req);
  if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const u = new URL(req.url).searchParams;
  const sp = { st: u.get("st") ?? undefined, d: u.get("d") ?? undefined, from: u.get("from") ?? undefined, to: u.get("to") ?? undefined, q: u.get("q") ?? undefined, p: u.get("p") ?? undefined };
  const { items, counts, total } = await partnerReturnList(db, s.id, sp);
  return NextResponse.json({ items, counts, total });
}
