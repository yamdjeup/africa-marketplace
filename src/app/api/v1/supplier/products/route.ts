import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supplierFromRequest } from "@/lib/mobile-supplier";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const products = await db.product.findMany({ where: { supplierId: sup.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const variants = await db.productVariant.findMany({ where: { productSlug: { in: products.map((p) => p.slug) } }, orderBy: { label: "asc" } });
  return NextResponse.json({
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      status: p.status as string,
      priceCents: p.priceCents,
      stock: p.stock,
      reserved: p.reserved,
      lowStockThreshold: p.lowStockThreshold,
      image: Array.isArray(p.images) ? ((p.images as string[])[0] ?? null) : null,
      rejectReason: p.rejectReason,
      variants: variants.filter((v) => v.productSlug === p.slug).map((v) => ({ id: v.id, label: v.label, stock: v.stock, reserved: v.reserved })),
    })),
  });
}
