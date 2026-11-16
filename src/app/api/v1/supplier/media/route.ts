import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { MAX_PHOTO_BYTES, photoStorage, sniffImage } from "@/lib/storage";

export const runtime = "nodejs";

// Même contrôles que /api/partner/media : fournisseur actif, ≤ 300 Ko, type vérifié sur les octets, 60 envois/h.
export async function POST(req: Request) {
  const sup = await supplierFromRequest(req);
  if (!sup || !sup.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "signature" ? "signature" : "photo";
  if (!(file instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });
  const recent = await db.mediaFile.count({ where: { ownerUserId: sup.userId, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent >= 60) return NextResponse.json({ error: "rate" }, { status: 429 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return NextResponse.json({ error: "type" }, { status: 415 });
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "photo";
  const stored = await photoStorage.put({ ownerUserId: sup.userId, name, mime, data: bytes, isPrivate: kind === "signature" });
  return NextResponse.json({ id: stored.id, url: stored.url });
}
