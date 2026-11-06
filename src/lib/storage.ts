import "server-only";
import { db } from "@/lib/db";

// Abstraction de stockage des photos. Implémentation par défaut : base de données (photos compressées ≤ 300 Ko).
// Pour passer à Vercel Blob : écrire une implémentation de PhotoStorage qui appelle `put` de @vercel/blob
// (url publique renvoyée par Blob) et la sélectionner quand BLOB_READ_WRITE_TOKEN est défini ; product.images
// accepte déjà n'importe quelle URL. Voir docs/DEPLOIEMENT.md.
export type StoredFile = { id: string; url: string };

export interface PhotoStorage {
  put(input: { ownerUserId: string; name: string; mime: string; data: Uint8Array; isPrivate?: boolean }): Promise<StoredFile>;
  remove(id: string): Promise<void>;
}

class DbStorage implements PhotoStorage {
  async put({ ownerUserId, name, mime, data, isPrivate }: { ownerUserId: string; name: string; mime: string; data: Uint8Array; isPrivate?: boolean }) {
    const row = await db.mediaFile.create({ data: { ownerUserId, name, mime, size: data.byteLength, isPrivate: !!isPrivate, data: data as Uint8Array<ArrayBuffer> }, select: { id: true } });
    return { id: row.id, url: `/api/media/${row.id}` };
  }
  async remove(id: string) {
    await db.mediaFile.deleteMany({ where: { id } });
  }
}

export const photoStorage: PhotoStorage = new DbStorage();

export const MAX_PHOTO_BYTES = 300 * 1024;
export const MAX_PHOTOS = 6;

export function sniffImage(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export const mediaIdFromUrl = (url: string) => /^\/api\/media\/([A-Za-z0-9_-]+)$/.exec(url)?.[1] ?? null;
