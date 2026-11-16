import "server-only";
import { db } from "@/lib/db";
import { userFromRequest } from "@/lib/mobile-auth";

/** Fournisseur ACTIF rattaché au jeton mobile ; null sinon (jamais de vue « admin » côté app). */
export async function supplierFromRequest(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return null;
  const supplier = await db.supplier.findUnique({ where: { userId: user.id } });
  return supplier && supplier.status === "ACTIVE" ? supplier : null;
}

export async function supplierOrders(supplierId: string, status: string) {
  const where = { supplierId, ...(status === "all" ? {} : status === "todo" ? { status: { in: ["PENDING", "ACCEPTED", "PREPARING"] as never[] } } : { status: status as never }) };
  const subs = await db.subOrder.findMany({ where, include: { order: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return subs.map((s) => ({
    id: s.id,
    number: s.number,
    status: s.status as string,
    createdAt: s.createdAt.toISOString(),
    customer: s.order.fullName,
    subtotalCents: s.subtotalCents,
    acceptBy: s.acceptBy ? s.acceptBy.toISOString() : null,
  }));
}
