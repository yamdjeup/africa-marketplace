import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";

export const runtime = "nodejs";

const MAX_FILES = 5;
// Limite de corps de requête des fonctions Vercel : ~4,5 Mo ; une requête par fichier.
const MAX_BYTES = 4 * 1024 * 1024;

function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "auth" }, 401);
  const userId = session.user.id;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "invalid" }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ error: "size" }, 413);
  if ((await db.applicationFile.count({ where: { userId, applicationId: null } })) >= MAX_FILES) return json({ error: "count" }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return json({ error: "type" }, 415);
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "fichier";
  const row = await db.applicationFile.create({ data: { userId, name, mime, size: bytes.length, data: bytes } });
  return json({ id: row.id, name: row.name, mime: row.mime, size: row.size });
}

// Lecture : propriétaire ou admin uniquement.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "auth" }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const row = await db.applicationFile.findUnique({ where: { id } });
  if (!row || (row.userId !== session.user.id && !isAdminEmail(session.user.email))) return json({ error: "notfound" }, 404);
  const pdf = row.mime === "application/pdf";
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `${pdf ? "attachment" : "inline"}; filename="${row.name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "auth" }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  await db.applicationFile.deleteMany({ where: { id, userId: session.user.id, applicationId: null } });
  return json({ ok: true });
}
