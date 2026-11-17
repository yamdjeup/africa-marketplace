import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userFromRequest } from "@/lib/mobile-auth";

export const runtime = "nodejs";

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;

function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

// Même contrôles que /api/partner/files (≤ 5 fichiers, 4 Mo, type vérifié sur les octets), authentifié par Bearer.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "size" }, { status: 413 });
  if ((await db.applicationFile.count({ where: { userId: user.id, applicationId: null } })) >= MAX_FILES) return NextResponse.json({ error: "count" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return NextResponse.json({ error: "type" }, { status: 415 });
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "fichier";
  const row = await db.applicationFile.create({ data: { userId: user.id, name, mime, size: bytes.length, data: bytes } });
  return NextResponse.json({ id: row.id, name: row.name });
}

export async function DELETE(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await db.applicationFile.deleteMany({ where: { id, userId: user.id, applicationId: null } });
  return NextResponse.json({ ok: true });
}
