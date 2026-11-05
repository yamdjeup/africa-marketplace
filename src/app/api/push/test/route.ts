import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// Test manuel protégé par CRON_SECRET : GET/POST /api/push/test?userId=<id> (Authorization: Bearer <CRON_SECRET>).
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(secret ?? "");
  const b = Buffer.from(given);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Unauthorized", { status: 401 });
  if (!isPushConfigured()) return NextResponse.json({ status: "unconfigured" });
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ status: "missing_userId" }, { status: 400 });
  const devices = await db.pushSubscription.count({ where: { userId } });
  const delivered = await sendPushToUser(userId, (l) => ({
    title: l === "fr" ? "Notification de test — E póm ta’" : "Test notification — E póm ta’",
    body: l === "fr" ? "Vos notifications push fonctionnent." : "Your push notifications work.",
    url: `/${l}/favoris`,
  }));
  return NextResponse.json({ status: devices === 0 ? "no_subscription" : "sent", devices, delivered });
}

export const GET = handle;
export const POST = handle;
