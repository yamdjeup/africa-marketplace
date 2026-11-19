import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeCarrierNames, listReturnReasons } from "@/lib/config-lists";
import { CARRIERS } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Listes configurables par l'administration : motifs de retour (client) et transporteurs (créateur).
export async function GET() {
  const reasons = (await listReturnReasons(db).catch(() => [])).map((r) => ({ id: r.id, fr: r.fr, en: r.en, requiresPhotos: r.requiresPhotos }));
  const carriers = await activeCarrierNames(db, CARRIERS);
  return NextResponse.json({ reasons, carriers });
}
