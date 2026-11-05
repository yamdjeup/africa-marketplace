import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isPushConfigured, vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

// Clé publique VAPID + disponibilité (la clé privée n'est jamais exposée).
export async function GET() {
  const configured = isPushConfigured();
  return NextResponse.json({ configured, publicKey: configured ? vapidPublicKey() : null });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isPushConfigured()) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; locale?: unknown };
  const s = b.subscription;
  if (typeof s?.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const data = { userId: session.user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, locale: b.locale === "en" ? "en" : "fr" };
  await db.pushSubscription.upsert({ where: { endpoint: s.endpoint }, create: { endpoint: s.endpoint, ...data }, update: data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof b.endpoint !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: b.endpoint, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
