import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";

export const runtime = "nodejs";

// Photos d'œuvres : publiques (immuables). Signatures (isPrivate) : propriétaire ou admin.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await db.mediaFile.findUnique({ where: { id } });
  if (!row) return new Response("Not found", { status: 404 });
  if (row.isPrivate) {
    const session = await auth();
    const allowed = !!session?.user?.id && (row.ownerUserId === session.user.id || isAdminEmail(session.user.email));
    // Signature d'une création publiée et attestée : affichée dans le bloc « Authenticité ».
    const shown = allowed || !!(await db.product.findFirst({ where: { signatureFileId: id, status: "PUBLISHED", authorAttestedAt: { not: null } }, select: { slug: true } }));
    if (!shown) return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": row.isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
