import { NextResponse } from "next/server";
import { userFromRequest } from "@/lib/mobile-auth";
import { storeReturnPhotos } from "@/lib/return-photos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Envoi d'une photo de retour (5 Mo max, JPEG/PNG/WebP) ; l'identifiant est ensuite passé dans `photos` de /api/v1/orders/return.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const r = await storeReturnPhotos(user.id, [file]);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "size" ? 413 : r.error === "type" ? 415 : r.error === "rate" ? 429 : 400 });
  return NextResponse.json({ id: r.ids[0] });
}
