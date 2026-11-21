import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifySubOrder } from "@/lib/order-notify";
import { notifyReturnReceived } from "@/lib/return-email";
import { applyTrackingUpdate } from "@/lib/tracking-events";
import { getTrackingProvider } from "@/lib/tracking-provider";

export const runtime = "nodejs";

function isTrackingEvent(raw: string) {
  try {
    return (JSON.parse(raw) as { event?: string }).event === "TRACKING_UPDATED";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const provider = getTrackingProvider();
  if (!provider) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const raw = await req.text();
  const update = provider.parseWebhook(raw, req.headers.get("sign"));
  if (!update) {
    // Le « WebHook test » 17TRACK n'est pas un TRACKING_UPDATED signé : 200 sans traitement ; une notification de suivi mal signée est rejetée.
    if (!req.headers.get("sign") && !isTrackingEvent(raw)) return NextResponse.json({ ok: true, ignored: true });
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }
  const r = await applyTrackingUpdate(db, update);
  console.log("[17track] webhook", update.number, update.status, r.outcome);
  if (r.subOrderId) {
    if (r.outcome === "delivered") await notifySubOrder("DELIVERED", r.subOrderId);
    else await notifyReturnReceived(r.subOrderId);
  }
  return NextResponse.json({ ok: true });
}
