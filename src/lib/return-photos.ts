import { sniffImage } from "./image-sniff";

// Photos jointes à une demande de retour (ex. article endommagé) : 5 photos max, 5 Mo chacune, JPEG/PNG/WebP vérifiés sur les octets.
export const RETURN_MAX_PHOTOS = 5;
export const RETURN_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export type PhotoError = "count" | "size" | "type" | "rate";

export const parsePhotoIds = (s: string | null | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Valide et enregistre les photos (privées, propriétaire = client). Renvoie les identifiants ou la première erreur. */
export async function storeReturnPhotos(userId: string, files: File[]): Promise<{ ok: true; ids: string[] } | { ok: false; error: PhotoError }> {
  const list = files.filter((f) => f.size > 0);
  if (list.length > RETURN_MAX_PHOTOS) return { ok: false, error: "count" };
  if (list.some((f) => f.size > RETURN_MAX_PHOTO_BYTES)) return { ok: false, error: "size" };
  const { db } = await import("./db");
  const { photoStorage } = await import("./storage");
  const recent = await db.mediaFile.count({ where: { ownerUserId: userId, isPrivate: true, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent + list.length > 30) return { ok: false, error: "rate" };
  const ids: string[] = [];
  for (const f of list) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(bytes);
    if (!mime) return { ok: false, error: "type" };
    const name = f.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "photo";
    ids.push((await photoStorage.put({ ownerUserId: userId, name, mime, data: bytes, isPrivate: true })).id);
  }
  return { ok: true, ids };
}
