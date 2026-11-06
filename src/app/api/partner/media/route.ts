import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MAX_PHOTO_BYTES, photoStorage, sniffImage } from "@/lib/storage";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => Response.json(body, { status });

// Téléversement d'une photo (≤ 300 Ko, déjà compressée côté client) ou d'une signature, réservé aux partenaires actifs.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "auth" }, 401);
  const userId = session.user.id;
  const supplier = await db.supplier.findUnique({ where: { userId } });
  if (!supplier || supplier.status !== "ACTIVE") return json({ error: "forbidden" }, 403);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "signature" ? "signature" : "photo";
  if (!(file instanceof File)) return json({ error: "invalid" }, 400);
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) return json({ error: "size" }, 413);
  const recent = await db.mediaFile.count({ where: { ownerUserId: userId, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent >= 60) return json({ error: "rate" }, 429);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return json({ error: "type" }, 415);
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "photo";
  const stored = await photoStorage.put({ ownerUserId: userId, name, mime, data: bytes, isPrivate: kind === "signature" });
  return json({ id: stored.id, url: stored.url });
}

// Suppression : propriétaire uniquement, et seulement si le fichier n'est pas utilisé par une œuvre publiée.
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "auth" }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const row = await db.mediaFile.findUnique({ where: { id }, select: { ownerUserId: true } });
  if (!row || row.ownerUserId !== session.user.id) return json({ error: "notfound" }, 404);
  const supplier = await db.supplier.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const published = supplier ? await db.product.findMany({ where: { supplierId: supplier.id, status: "PUBLISHED" }, select: { images: true } }) : [];
  if (published.some((p) => JSON.stringify(p.images).includes(id))) return json({ error: "inuse" }, 409);
  await photoStorage.remove(id);
  return json({ ok: true });
}
