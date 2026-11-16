import { NextResponse } from "next/server";
import { checkAddress, formatStreet, readAddress } from "@/lib/address";
import { db } from "@/lib/db";
import { userFromRequest } from "@/lib/mobile-auth";
import { hasLockedSubOrder, isAddressEditable, isOrderOwner } from "@/lib/order-edit";

export const dynamic = "force-dynamic";

// Modification de l'adresse d'une commande par son propriétaire (même logique que updateOrderAddress du site, checkout/actions.ts).
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const field = (n: string) => String(b[n] ?? "").trim().slice(0, 200);
  const order = await db.order.findUnique({ where: { number: field("number") } });
  if (!order || !isOrderOwner(order, undefined, user.id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isAddressEditable(order.createdAt) || (await hasLockedSubOrder(order.id))) return NextResponse.json({ error: "locked" }, { status: 409 });
  const addr = readAddress(field);
  const problem = checkAddress(addr);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await db.order.update({
    where: { number: order.number },
    data: {
      fullName: `${addr.firstName} ${addr.lastName}`,
      address: formatStreet(addr, order.locale === "en" ? "en" : "fr"),
      postalCode: addr.postalCode,
      city: addr.city,
      country: addr.country,
      phone: addr.phone,
      street: addr.line1,
      houseNumber: addr.houseNumber,
      box: addr.box || null,
      complement: addr.line2 || null,
    },
  });
  return NextResponse.json({ ok: true });
}
