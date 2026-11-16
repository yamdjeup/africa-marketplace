import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { settleSubRefund } from "@/lib/refund";
import { acceptSub, deliverSub, prepareSub, refuseSub, shipSub } from "@/lib/suborders";
import { supplierFromRequest } from "@/lib/mobile-supplier";
import { subLabel } from "@/lib/suborders";
import { cleanTrackingNumber } from "@/lib/tracking";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const sub = await db.subOrder.findFirst({ where: { id, supplierId: sup.id }, include: { order: true } });
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const items = await db.orderItem.findMany({ where: { subOrderId: sub.id } });
  const o = sub.order;
  return NextResponse.json({
    id: sub.id,
    number: sub.number,
    status: sub.status as string,
    statusLabel: { fr: subLabel(sub.status).fr, en: subLabel(sub.status).en },
    createdAt: sub.createdAt.toISOString(),
    acceptBy: sub.acceptBy ? sub.acceptBy.toISOString() : null,
    subtotalCents: sub.subtotalCents,
    carrier: sub.carrier,
    trackingNumber: sub.trackingNumber ? cleanTrackingNumber(sub.trackingNumber) : null,
    reason: sub.reason,
    items: items.map((i) => ({ id: i.id, name: i.name, size: i.size, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
    shipTo: { fullName: o.fullName, address: o.address, postalCode: o.postalCode, city: o.city, country: o.country, phone: o.phone },
  });
}

// Mêmes transitions que les actions du site (commandes-actions.ts), filtrées par propriétaire (supplierId).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sup = await supplierFromRequest(req);
  if (!sup) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = { id: sup.userId, label: sup.displayName };
  const state = () => NextResponse.json({ error: "state" }, { status: 409 });
  switch (b.action) {
    case "accept": {
      if (!(await acceptSub(db, id, sup.id))) return state();
      await notifySubOrder("ACCEPTED", id);
      break;
    }
    case "refuse": {
      const reason = str(b.reason, 500);
      if (reason.length < 3) return NextResponse.json({ error: "reason" }, { status: 400 });
      if (!(await refuseSub(db, id, sup.id, reason, actor))) return state();
      await settleSubRefund(id);
      await notifySubOrder("REFUSED", id);
      break;
    }
    case "prepare": {
      if (!(await prepareSub(db, id, sup.id))) return state();
      await notifySubOrder("PREPARING", id);
      break;
    }
    case "ship": {
      const carrier = str(b.carrier, 80);
      const tracking = cleanTrackingNumber(str(b.tracking, 80));
      if (!carrier || !tracking) return NextResponse.json({ error: "tracking" }, { status: 400 });
      let sub = null;
      try {
        sub = await shipSub(db, id, sup.id, carrier, tracking, actor);
      } catch {
        return NextResponse.json({ error: "stock" }, { status: 409 });
      }
      if (!sub) return state();
      await notifySubOrder("SHIPPED", id);
      break;
    }
    case "deliver": {
      if (!(await deliverSub(db, id, sup.id))) return state();
      await notifySubOrder("DELIVERED", id);
      break;
    }
    default:
      return NextResponse.json({ error: "action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
