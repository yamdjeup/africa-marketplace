import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { isKind, listReasons } from "@/lib/refusal-reasons";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await supplierFromRequest(req);
  if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const kind = new URL(req.url).searchParams.get("kind");
  if (!isKind(kind)) return NextResponse.json({ error: "kind" }, { status: 400 });
  const rows = await listReasons(db, kind);
  return NextResponse.json({ reasons: rows.map((r) => ({ id: r.id, fr: r.fr, en: r.en })) });
}
