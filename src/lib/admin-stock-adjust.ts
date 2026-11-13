import { db } from "@/lib/db";
import { adjustStock } from "@/lib/stock";

export type AdminAdjustResult = "ok" | "notfound" | "delta" | "reason" | "below";

/** Ajustement de stock par l'admin sur n'importe quelle pièce ; motif obligatoire, auteur = e-mail de l'admin. */
export async function adminAdjustStock(input: { slug: string; variant: string | null; type: "ENTRY" | "ADJUST"; delta: number; reason: string; admin: { id: string; email: string } }): Promise<AdminAdjustResult> {
  const p = await db.product.findUnique({ where: { slug: input.slug }, select: { slug: true } });
  if (!p) return "notfound";
  let delta = input.delta;
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) return "delta";
  if (input.type === "ENTRY") delta = Math.abs(delta);
  const reason = input.reason.trim().slice(0, 200);
  if (!reason) return "reason";
  const ok = await db.$transaction((tx) => adjustStock(tx, { slug: p.slug, label: input.variant || null }, delta, input.type, reason, { id: input.admin.id, label: input.admin.email }));
  return ok ? "ok" : "below";
}
