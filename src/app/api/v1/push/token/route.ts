import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isExpoToken } from "@/lib/push";
import { userFromRequest } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// Équivalent mobile de /api/push/subscribe : le jeton Expo est stocké dans PushSubscription.endpoint.
export async function POST(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { token?: unknown; locale?: unknown };
  if (typeof b.token !== "string" || !isExpoToken(b.token)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = { userId: u.id, p256dh: "expo", auth: "expo", locale: b.locale === "en" ? "en" : "fr" };
  await db.pushSubscription.upsert({ where: { endpoint: b.token }, create: { endpoint: b.token, ...data }, update: data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await userFromRequest(req);
  if (!u) return unauthorized();
  const b = (await req.json().catch(() => ({}))) as { token?: unknown };
  if (typeof b.token !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: b.token, userId: u.id } });
  return NextResponse.json({ ok: true });
}
