import type { PrismaClient } from "@prisma/client";

export type WithdrawResult = "ok" | "notfound" | "changed";

// Repasse une création Soumise en brouillon. Atomique : si l'admin a décidé entre-temps (publiée/refusée), rien n'est modifié.
export async function withdrawSubmission(db: Pick<PrismaClient, "product">, slug: string, supplierId: string): Promise<WithdrawResult> {
  const p = await db.product.findUnique({ where: { slug }, select: { supplierId: true } });
  if (!p || p.supplierId !== supplierId) return "notfound";
  const r = await db.product.updateMany({ where: { slug, supplierId, status: "SUBMITTED" }, data: { status: "DRAFT", submittedAt: null } });
  return r.count === 1 ? "ok" : "changed";
}
