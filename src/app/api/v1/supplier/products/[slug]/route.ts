import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withdrawSubmission } from "@/lib/product-withdraw";
import { emailAdminProductSubmitted } from "@/lib/supplier-email";
import { adjustStock, syncProductTotals } from "@/lib/stock";
import { notifyLowStock, snapshotAvail } from "@/lib/stock-alerts";
import { supplierFromRequest } from "@/lib/mobile-supplier";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Mêmes règles que oeuvres-actions.ts (site), toujours filtrées par propriétaire (supplierId).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const sup = await supplierFromRequest(req);
  if (!sup || !sup.userId) return bad("forbidden", 403);
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug } });
  if (!p || p.supplierId !== sup.id) return bad("not_found", 404);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = { id: sup.userId, label: sup.displayName };

  switch (b.action) {
    case "submit": {
      if ((p.status !== "DRAFT" && p.status !== "REJECTED") || (Array.isArray(p.images) ? p.images.length : 0) === 0 || p.description.length < 20) return bad("incomplete", 409);
      await db.product.update({ where: { slug }, data: { status: "SUBMITTED", submittedAt: new Date(), rejectReason: null, decidedAt: null } });
      await emailAdminProductSubmitted(sup.displayName, p.name);
      break;
    }
    case "withdraw": {
      const r = await withdrawSubmission(db, slug, sup.id);
      if (r !== "ok") return bad("decided", 409);
      break;
    }
    case "delete": {
      const sold = await db.orderItem.count({ where: { productSlug: slug } });
      if (sold > 0 || p.status === "PUBLISHED" || p.status === "SUBMITTED") return bad("undeletable", 409);
      await db.stockMovement.deleteMany({ where: { productSlug: slug } });
      await db.product.delete({ where: { slug } });
      break;
    }
    case "adjust": {
      const type = b.type === "ENTRY" ? "ENTRY" : "ADJUST";
      let delta = int(b.delta);
      if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) return bad("delta");
      if (type === "ENTRY") delta = Math.abs(delta);
      const reason = str(b.reason, 200) || (type === "ENTRY" ? "Entrée de stock" : "");
      if (!reason) return bad("reason");
      const before = await snapshotAvail([slug]);
      const ok = await db.$transaction((tx) => adjustStock(tx, { slug, label: str(b.variant, 60) || null }, delta, type, reason, actor));
      if (!ok) return bad("below", 409);
      if (delta < 0) await notifyLowStock(before).catch(() => undefined);
      break;
    }
    case "addVariant": {
      const label = str(b.label, 60);
      const qty = int(b.qty);
      if (!label || !Number.isFinite(qty) || qty < 0 || qty > 100000) return bad("variants");
      if (await db.productVariant.findFirst({ where: { productSlug: slug, label } })) return bad("variants");
      await db.$transaction(async (tx) => {
        if ((await tx.productVariant.count({ where: { productSlug: slug } })) === 0 && p.stock > 0) {
          await tx.productVariant.create({ data: { productSlug: slug, label: "Standard", stock: p.stock, reserved: p.reserved } });
        }
        const row = await tx.productVariant.create({ data: { productSlug: slug, label, stock: qty } });
        if (qty > 0) await tx.stockMovement.create({ data: { productSlug: slug, variantId: row.id, type: "ENTRY", quantity: qty, reason: `Nouvelle variante ${label}`, authorId: sup.userId, authorLabel: sup.displayName } });
        await syncProductTotals(tx, slug);
      });
      break;
    }
    default:
      return bad("action");
  }
  return NextResponse.json({ ok: true });
}
